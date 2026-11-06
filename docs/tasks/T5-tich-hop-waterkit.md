# T5 · Tích hợp bộ công cụ WaterKit đã Việt hoá

## Quyết định của người dùng (2026-11-06)
- Đưa từ 90% trở lên nội dung WaterKit bản Việt hoá vào hệ thống.
- Chuyển giấy phép của dự án sang **AGPL-3.0**. Từ nay quy tắc cũ "không sao chép mã AGPL" không còn áp dụng cho WaterKit. Bù lại phải tuân thủ đầy đủ AGPL.
- Cách tích hợp: **nhúng nguyên các trang tĩnh** và thay đầu trang bằng thanh menu của site. Không viết lại các trang này bằng React.

## Nguồn
- Repo: `https://github.com/phuonglhk070717/waterkit`, nhánh `viet-hoa`, commit `4110108537de98be5b757fc08cc8e457ac11f6d3`. Đây là bản fork của `chengsunmail/waterkit`, tác giả Cheng Sun, đơn vị phát hành Dengdeng Technology (Hải Nam).
- Mỗi trang là một tệp HTML tự chứa: CSS và JS viết ngay trong tệp, không có quảng cáo và không có analytics.
- Clone nguồn vào một thư mục tạm **ngoài repo**. Không commit thư mục clone đó.

## A. Đưa trang vào `public/waterkit/`
1. **Chép các trang sau, giữ nguyên tên tệp:**
   - Thủy lực: `pipe-hydraulic-calculator`, `pipe-hydraulic-pro`, `open-channel-calculator`, `weir-flow-calculator`, `orifice-nozzle-calculator`.
   - Công nghệ xử lý: `aeration-calculator`, `sludge-production-calculator`, `dosing-calculator`, `activated-sludge-process-calculator`, `mbbr-design`, `ifas-design`, `mbr-design`, `ro-design`.
   - Thiết bị: `pump-selection-calculator`, `blower-selection-calculator`.
   - Chuyển đổi: `water-quality-unit-converter`.
   - Thủy sản: `tailwater`, `aquanor-2027-guide-cn`.
   - Không chép: `index.html` (thay bằng mục B), `404.html` (site đã có), `ads.txt`, `robots.txt`, `sitemap.xml`, `wrangler.toml`, `_redirects`.
2. **Giữ nguyên toàn bộ nội dung, công thức, bảng và JS tính toán.** Chỉ được sửa:
   - **Đầu trang (`<header class="topbar">`):** thay bằng thanh menu của site, gồm Trang chủ, Quy trình, Thiết kế, Thiết bị, **Xử lý nước** và Giới thiệu.
     - Dùng đường dẫn tương đối `../` để chạy được với cả base `/` lẫn `/ras-digital-twin/`.
     - Màu và chữ lấy theo site hiện tại (nền tối, IBM Plex).
     - Thanh menu phải xuống dòng được, không gây tràn ngang ở 375 px.
   - **Chân trang:** bỏ phần giới thiệu và quảng bá Dengdeng, thay bằng dòng ghi công:
     > Nội dung gốc: WaterKit © Cheng Sun / Dengdeng Technology (https://github.com/chengsunmail/waterkit), giấy phép AGPL-3.0. Bản Việt hoá và chỉnh sửa giao diện để tích hợp vào RAS Digital Twin.

     Kèm liên kết **"Mã nguồn"** tới `https://github.com/phuonglhk/ras-digital-twin`. AGPL §13 bắt buộc dẫn mã nguồn khi phục vụ qua mạng.
   - **Liên kết:**
     - Bỏ `rel="canonical"` và các thẻ `og:url` trỏ về `waterkit.cn`.
     - Liên kết `index.html` hoặc `index.html#...` trỏ về trang danh mục ở mục B, đúng nhóm.
     - Liên kết tới `dengdengtech.cn` thì bỏ, trừ dòng ghi công.
     - Liên kết sang `iras.cn` được giữ.
   - **Phần còn sót tiếng Trung hiển thị cho người dùng:** dịch nốt sang tiếng Việt. Nêu trong báo cáo đã sửa ở trang nào.
3. **Đầu mỗi tệp đã sửa** thêm chú thích HTML ghi: nguồn, commit gốc, "đã sửa đổi ngày …" và giấy phép AGPL-3.0.

## B. Trang danh mục `/xu-ly-nuoc` (React, trong `Site.tsx`)
- Thêm mục "Xử lý nước" lên menu chính và mục "Bộ công cụ xử lý nước" lên trang chủ.
- Trang này liệt kê các trang ở mục A theo nhóm, dịch từ `index.html` và README của WaterKit. Mỗi trang có tên, mô tả một dòng, tiêu chuẩn hoặc công thức chính, và liên kết tới `${BASE_URL}waterkit/<tên>.html`.
- Có nhãn "(Beta)" cho các trang mà bản gốc gắn Beta.
- Ghi rõ nguồn và giấy phép ở đầu trang.

## C. Liên kết chéo từ các phần đã có
Thêm liên kết "Tính chi tiết trong bộ công cụ xử lý nước →" tới trang WaterKit tương ứng:
- **Trang thiết bị:** bơm → `pump-selection-calculator`; MBBR → `mbbr-design`; máy thổi khí hoặc sục khí → `blower-selection-calculator` và `aeration-calculator`; bể lắng hoặc lọc → `sludge-production-calculator` nếu hợp; định lượng kiềm → `dosing-calculator`.
- **`/thiet-ke`:** trong phần thủy lực, ống góp tính bằng Hazen–Williams → `pipe-hydraulic-pro`; mương sàn (Manning) → `open-channel-calculator`; bơm của phòng lọc → `pump-selection-calculator`.
- **`/cong-cu`:** ở bộ chuyển đổi đơn vị → `water-quality-unit-converter`.
- **`/quy-trinh`:** ở khâu MBBR → `mbbr-design`. Ở phần nước thải hoặc xả thải, nếu có → `tailwater`.

## D. Giấy phép và tài liệu
- Thay `LICENSE` bằng toàn văn AGPL-3.0, lấy từ tệp LICENSE của WaterKit. `package.json` khai `"license": "AGPL-3.0-only"`.
- README:
  - Sửa mục "Giới hạn và giấy phép": dự án nay theo AGPL-3.0, có tích hợp WaterKit, ghi công tác giả.
  - Thêm danh sách các trang WaterKit đã tích hợp.
  - Thêm câu: iRAS vẫn chỉ là nguồn tham khảo, không sao chép mã.
- Footer chung của site thêm liên kết "Mã nguồn (AGPL-3.0)" tới repo GitHub.

## E. Kiểm tra tự động
- Thêm test (vitest, đọc tệp bằng `fs`) cho mọi tệp trong `public/waterkit/`. Mỗi tệp phải:
  - có dòng ghi công và chữ AGPL-3.0;
  - có liên kết "Mã nguồn";
  - không có `waterkit.cn` trong canonical hoặc og;
  - không có `<script src>` nào trỏ ra ngoài;
  - mọi `href` tương đối tới `.html` phải trỏ tới một tệp có thật.
- Test trang danh mục: mọi liên kết ở mục B phải trỏ tới một tệp có thật.
- `npm.cmd run format` không định dạng lại các tệp trong `public/waterkit/`. Thêm thư mục này vào `.prettierignore`.

## Tiêu chí nghiệm thu
- `npm.cmd run format`, `npx.cmd tsc --noEmit`, `npm.cmd test` và `npm.cmd run build` đều đạt. Tự kiểm vẫn 48/48. Không commit, không push, không tạo tệp tạm trong repo.
- Phải có ít nhất 18/20 trang của bản nguồn (≥ 90%).
- Báo cáo phải có:
  - danh sách tệp kèm kích thước trước và sau khi sửa;
  - phần nào đã sửa ngoài đầu trang và chân trang;
  - kết quả tự kiểm tích hợp sẵn của trang RO (29/29) và trang tailwater (52/52) khi chạy trong site.
- Claude sẽ kiểm trên trình duyệt:
  - mở từng trang qua `/xu-ly-nuoc`;
  - tính thử một phép ở mỗi nhóm;
  - menu quay về site đúng;
  - không tràn ngang ở 375 px;
  - chạy được cả base `/` lẫn `/ras-digital-twin/`.
