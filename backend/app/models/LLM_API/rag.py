import google.generativeai as genai
import faiss
import numpy as np
import torch
from PIL import Image
import os
import tempfile
import shutil
import torchvision.io as tv_io
from typing import List, Dict, Optional, Union

# === PE-Core Import ===
import models.perception_models.core.vision_encoder.pe as pe
import models.perception_models.core.vision_encoder.transforms as pe_transforms

# === Gemini ===
GEMINI_API_KEY = "AIzaSyCtXz3hGA8IETlrot7jN_d9DtIMOHlMRAc"
genai.configure(api_key=GEMINI_API_KEY)


class MultimodalRAGSystem:
    """RAG System dùng PE-Core (best zero-shot CLIP) cho PDF + Video Frame Retrieval"""
    
    def __init__(self, collection_name: str = "multimodal_kb"):
        print("Initializing Multimodal RAG with PE-Core (G14-448)...")
        
        # === Load PE-Core Model (mạnh nhất hiện nay) ===
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Using device: {self.device}")

        self.clip_model = pe.CLIP.from_config("PE-Core-G14-448", pretrained=True)  # hoặc "PE-Core-L14-336" nếu muốn nhanh hơn
        self.clip_model = self.clip_model.to(self.device).eval()

        self.image_size = self.clip_model.image_size
        self.context_length = self.clip_model.context_length
        self.logit_scale = self.clip_model.logit_scale.exp()

        self.image_transform = pe_transforms.get_image_transform(self.image_size)
        self.text_tokenizer = pe_transforms.get_text_tokenizer(self.context_length)

        self.dim = self.clip_model.text_projection.shape[1]
        print(f"PE-Core loaded: {self.image_size}px, dim={self.dim}")

        # === FAISS Index (Inner Product = Cosine sau khi normalize) ===
        self.index = faiss.IndexFlatIP(self.dim)  # Inner Product cho cosine similarity
        self.documents = []      # text chunks hoặc mô tả frame
        self.metadatas = []      # metadata: source, frame_id, timestamp, type
        self.temp_dir = tempfile.mkdtemp(prefix="rag_frames_")
        print(f"Temporary frames saved to: {self.temp_dir}")

        # === Gemini ===
        self.gemini = genai.GenerativeModel('gemini-1.5-flash-exp-0827')  
        print("Multimodal RAG System ready!")

    # ===================== PDF TEXT =====================
    def add_pdf(self, pdf_path: str, chunk_size: int = 1000, overlap: int = 200):
        from PyPDF2 import PdfReader
        print(f"Adding PDF: {pdf_path}")
        try:
            reader = PdfReader(pdf_path)
            text = ""
            for i, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    text += f"\n--- Page {i+1} ---\n{page_text}"

            chunks = self._chunk_text(text, chunk_size, overlap)
            embeddings = self._encode_text_chunks(chunks)
            
            start_id = len(self.documents)
            self.index.add(embeddings)
            self.documents.extend(chunks)
            self.metadatas.extend([
                {"type": "text", "source": pdf_path, "chunk_id": i, "page_hint": f"Page {i//3 + 1}"}
                for i in range(len(chunks))
            ])
            print(f"Added {len(chunks)} text chunks from PDF")
        except Exception as e:
            print(f"Error adding PDF: {e}")

    def _chunk_text(self, text: str, chunk_size=1000, overlap=200) -> List[str]:
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            if end < len(text):
                break_point = max(chunk.rfind('.'), chunk.rfind('\n'))
                if break_point > chunk_size * 0.6:
                    chunk = chunk[:break_point+1]
                    end = start + break_point + 1
            if chunk.strip():
                chunks.append(chunk.strip())
            start = end - overlap
        return chunks

    def _encode_text_chunks(self, texts: List[str]) -> np.ndarray:
        tokens = self.text_tokenizer(texts).to(self.device)
        with torch.no_grad(), torch.autocast(self.device):
            embeddings = self.clip_model.encode_text(tokens, normalize=True)
        return embeddings.cpu().numpy().astype('float32')

    # ===================== VIDEO FRAMES =====================
    def add_video(self, video_path: str, sample_fps: float = 1.0):
        """Thêm video, trích khung hình theo sample_fps"""
        print(f"Adding video: {video_path} @ {sample_fps} FPS")
        if not os.path.exists(video_path):
            print("Video not found!")
            return

        video, _, info = tv_io.read_video(video_path, pts_unit='sec')
        fps = info.get('video_fps', 30.0)
        total_frames = video.shape[0]
        interval = max(1, int(fps / sample_fps))

        frames_to_save = []
        frame_indices = list(range(0, total_frames, interval))

        for idx in frame_indices:
            frame = video[idx]
            pil_img = Image.fromarray(frame.numpy())
            save_path = os.path.join(self.temp_dir, f"{os.path.basename(video_path)}_{idx:06d}.jpg")
            pil_img.save(save_path)

            # Mô tả ngắn để tăng recall (tùy chọn)
            caption = f"frame {idx//int(fps)}s from {os.path.basename(video_path)}"
            frames_to_save.append((pil_img, save_path, idx / fps, caption))

        if not frames_to_save:
            return

        # Encode tất cả frame cùng lúc
        images = [f[0] for f in frames_to_save]
        embeddings = self._encode_images(images)

        self.index.add(embeddings)
        for (pil_img, path, timestamp, caption) in frames_to_save:
            self.documents.append(caption)
            self.metadatas.append({
                "type": "frame",
                "source": video_path,
                "frame_path": path,
                "timestamp": round(timestamp, 2),
                "frame_id": len(self.documents)
            })
        print(f"Added {len(frames_to_save)} frames (~{sample_fps} FPS)")

    def _encode_images(self, images: List[Image.Image]) -> np.ndarray:
        batch = torch.stack([self.image_transform(img) for img in images]).to(self.device)
        with torch.no_grad(), torch.autocast(self.device):
            embeddings = self.clip_model.encode_image(batch, normalize=True)
        return embeddings.cpu().numpy().astype('float32')

    # ===================== QUERY =====================
    def query(self, question: str, top_k: int = 8) -> Dict:
        print(f"\nQuestion: {question}")

        if self.index.ntotal == 0:
            return {"answer": "Chưa có dữ liệu. Hãy thêm PDF hoặc video trước.", "results": []}

        # === Encode query text ===
        query_tokens = self.text_tokenizer([question]).to(self.device)
        with torch.no_grad(), torch.autocast(self.device):
            query_emb = self.clip_model.encode_text(query_tokens, normalize=True)
        query_emb = query_emb.cpu().numpy().astype('float32')

        # === Search ===
        scores, indices = self.index.search(query_emb, top_k * 2)
        scores, indices = scores[0], indices[0]

        results = []
        relevant_images = []
        context_texts = []

        for score, idx in zip(scores, indices):
            if idx == -1 or idx >= len(self.metadatas): 
                continue
            meta = self.metadatas[idx]
            if meta["type"] == "frame":
                img = Image.open(meta["frame_path"])
                relevant_images.append(img)
                results.append({
                    "type": "video_frame",
                    "score": float(score),
                    "timestamp": meta["timestamp"],
                    "source": meta["source"],
                    "image": img
                })
                context_texts.append(f"Frame tại {meta['timestamp']}s: có thể có '{question}'")
            else:
                context_texts.append(self.documents[idx])
                results.append({
                    "type": "text",
                    "score": float(score),
                    "source": meta["source"],
                    "text": self.documents[idx][:200] + "..."
                })

        # === Relevance Check by Gemini ===
        if not relevant_images and not context_texts:
            return {"answer": "NO", "results": results[:top_k]}

        prompt = [
            "Bạn là trợ lý tìm kiếm hình ảnh/video chính xác. Hãy trả lời câu hỏi sau chỉ bằng cách dùng thông tin từ các khung hình và văn bản được cung cấp.",
            "Nếu không chắc chắn hoặc không thấy liên quan → trả lời 'NO'",
            f"Câu hỏi: {question}",
            "Các khung hình liên quan:",
        ] + relevant_images + [
            "\nVăn bản liên quan:\n" + "\n\n".join(context_texts[:3]),
            "Trả lời ngắn gọn, chính xác:"
        ]

        try:
            response = self.gemini.generate_content(prompt)
            answer = response.text.strip()
        except Exception as e:
            answer = f"Lỗi Gemini: {e}"

        return {
            "answer": answer if answer != "NO" and "không thấy" not in answer.lower() else "NO",
            "results": results[:top_k],
            "retrieved_images": len(relevant_images),
            "top_score": float(scores[0]) if len(scores) > 0 else 0
        }

    # ===================== UTILS =====================
    def clear(self):
        self.index = faiss.IndexFlatIP(self.dim)
        self.documents.clear()
        self.metadatas.clear()
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
        self.temp_dir = tempfile.mkdtemp(prefix="rag_frames_")
        print("Database cleared")

    def stats(self):
        return {
            "total_entries": self.index.ntotal,
            "temp_dir": self.temp_dir
        }


# ===================== SỬ DỤNG =====================
if __name__ == "__main__":
    rag = MultimodalRAGSystem()

    # Thêm dữ liệu
    rag.add_video("videos/cat_jump.mp4", sample_fps=2.0)
    rag.add_pdf("docs/manual.pdf")

    # Tìm chính xác frame có vật thể
    result = rag.query("con mèo nhảy lên bàn")
    print("Answer:", result["answer"])
    for r in result["results"][:3]:
        if r["type"] == "video_frame":
            print(f"→ Frame tại {r['timestamp']}s (score: {r['score']:.3f})")
            r["image"].show()  # hiện ảnh
