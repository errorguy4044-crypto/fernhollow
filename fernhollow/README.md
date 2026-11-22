# Fernhollow — Night Flower Valley Hero

Toàn bộ mã nguồn và bản đóng gói 1 tệp của trang hero 3D **Fernhollow**.

## Cấu trúc thư mục

- `index.html` — Bản đóng gói hoàn chỉnh trong **1 tệp duy nhất** (mở trực tiếp trên trình duyệt là chạy, không cần internet cho Three.js/WebGL/Audio).
- `src/valley-engine.js` — Mã nguồn chính (dễ đọc, không nén) của engine thung lũng hoa 3D:
  - Địa hình thung lũng hình chữ U & đường bay camera `CatmullRomCurve3` lặp vô tận
  - Atlas 8 loài hoa dại & 4 cụm lá rừng xanh rêu vẽ bằng Canvas 2D
  - 50.000 cụm lá + 29.000 bông hoa dại mọc theo mảng màu tự nhiên + hạt phấn hoa
  - Hiệu ứng rẽ hoa & phát sáng giữ màu theo con trỏ chuột, chuyển cảnh bung hạt khi hover nút mũi tên (`#go`)
  - Hậu kỳ đa tầng: **Optical Radial Peripheral Lens Blur** (blur viền xung quanh), **HDR Bloom 3 tầng**, **ACES tone mapping**, **Split-RGB film grain**, và **vignette theo tốc độ cuộn**
  - Âm thanh nền tổng hợp thời gian thực qua `THREE.AudioListener` + bộ lọc `lowpass` khi hover
- `src/three-entry.js` — Danh sách các module Three.js được dùng.
- `src/three-slim.min.js` — Bản Three.js rút gọn đã đóng gói sẵn để nhúng vào `index.html`.
- `build.js` — Khung HTML/CSS giao diện Fernhollow và script gộp mọi thứ ra `index.html`.
- `serve.js` — Máy chủ xem trước cục bộ (không cần cài thêm thư viện).

## Cách sử dụng

1. **Mở trực tiếp**: Nhấp đúp `index.html` hoặc chạy máy chủ xem trước:
   ```bash
   node serve.js
   ```
   Sau đó mở `http://127.0.0.1:4173/`.
2. **Chỉnh sửa và build lại**:
   - Sửa giao diện / CSS trong `build.js` hoặc sửa hiệu ứng 3D / shader / màu hoa trong `src/valley-engine.js`.
   - Chạy lại lệnh build:
     ```bash
     node build.js
     ```
     Tệp `index.html` sẽ được cập nhật tự động.
