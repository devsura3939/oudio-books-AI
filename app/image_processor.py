# -*- coding: utf-8 -*-
import io
from typing import List, Tuple
import numpy as np
from PIL import Image, ImageFilter, ImageOps, ImageEnhance


def score_image_sharpness(img: Image.Image) -> float:
    gray = img.convert("L")
    arr = np.asarray(gray, dtype=np.float32)
    h, w = arr.shape
    if h < 3 or w < 3:
        return 0.0

    lap = (
        4 * arr[1:-1, 1:-1]
        - arr[:-2, 1:-1]
        - arr[2:, 1:-1]
        - arr[1:-1, :-2]
        - arr[1:-1, 2:]
    )
    return float(np.var(lap))


def select_best_burst_frame(frame_bytes_list: List[bytes]) -> Tuple[int, Image.Image, float]:
    best_idx = 0
    best_img = None
    best_score = -1.0

    for idx, b in enumerate(frame_bytes_list):
        try:
            img = Image.open(io.BytesIO(b))
            img.load()
            score = score_image_sharpness(img)
            if score > best_score:
                best_score = score
                best_img = img
                best_idx = idx
        except Exception as e:
            print(f"[image_processor] burst frame {idx} decode error: {e}")

    if best_img is None and frame_bytes_list:
        best_img = Image.open(io.BytesIO(frame_bytes_list[0]))
        best_img.load()
        best_score = score_image_sharpness(best_img)

    return best_idx, best_img, best_score


def flatten_illumination_homomorphic(gray_arr: np.ndarray, radius: int = 32) -> np.ndarray:
    pil_gray = Image.fromarray(gray_arr.astype(np.uint8), mode="L")
    bg = pil_gray.filter(ImageFilter.BoxBlur(radius))
    bg_arr = np.asarray(bg, dtype=np.float32)
    bg_arr = np.maximum(bg_arr, 1.0)
    normalized = (gray_arr.astype(np.float32) / bg_arr) * 235.0
    return np.clip(normalized, 0, 255).astype(np.uint8)


def enhance_page_image(
    img: Image.Image,
    target_dpi_dim: int = 2400,
    apply_unsharp: bool = True
) -> Image.Image:
    img = ImageOps.exif_transpose(img)
    gray = img.convert("L")
    w, h = gray.size
    max_dim = max(w, h)

    radius = max(12, int(max_dim / 32))
    gray_arr = np.asarray(gray, dtype=np.float32)
    flattened_arr = flatten_illumination_homomorphic(gray_arr, radius=radius)
    enhanced = Image.fromarray(flattened_arr, mode="L")

    upscale_factor = 1
    if max_dim < 1400:
        upscale_factor = 3
    elif max_dim < target_dpi_dim:
        upscale_factor = 2

    if upscale_factor > 1:
        new_w = w * upscale_factor
        new_h = h * upscale_factor
        enhanced = enhanced.resize((new_w, new_h), resample=Image.Resampling.BICUBIC)

    if apply_unsharp:
        enhanced = enhanced.filter(ImageFilter.UnsharpMask(radius=1, percent=150, threshold=3))
        enhanced = enhanced.filter(ImageFilter.UnsharpMask(radius=2, percent=75, threshold=2))

    contrast = ImageEnhance.Contrast(enhanced)
    enhanced = contrast.enhance(1.2)

    return enhanced


def image_to_jpeg_bytes(img: Image.Image, quality: int = 95) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    return buf.getvalue()
