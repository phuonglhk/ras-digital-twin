# T1 · Nâng mô hình hoá nước lên ngang iRAS

Người giao: Claude (giám sát). Người làm: Codex. Repo: `D:\GitSource\ras-digital-twin`, nhánh `main`.

## Bối cảnh

Dự án là Digital Twin minh hoạ một hệ RAS, chạy hoàn toàn ở trình duyệt (Vite + React + TypeScript + three.js).
Bản nền đã có ở commit `72a536a`:

- `src/model/chemistry.ts`: NH₃ tự do (Emerson 1975 + Khoo 1977), pH Henderson–Hasselbalch, Ω canxit, DO bão hoà Benson–Krause.
- `src/model/process.ts`: tải từ thức ăn, từng thiết bị trên tuyến (`passChain`), cân bằng chất (`rates`, `step`, `steadyState`), báo cáo thiết bị (`report`), cảnh báo (`warnings`).
- `src/model/simulation.ts`: tích phân theo thời gian.
- `src/model/model.test.ts`: 12 test Vitest.
- `src/ui/*`, `src/App.tsx`: giao diện tiếng Việt.

Tham khảo mô hình: iRAS, https://iras.cn và https://github.com/chengsunmail/iras.

## Ràng buộc bắt buộc

1. **Không chép code của iRAS.** Repo đó dùng giấy phép AGPL-3.0. Chỉ dùng công thức và tài liệu khoa học được trích dẫn (Millero 2010, Dickson 1990, Timmons & Ebeling 2010...). Tự viết lại toàn bộ.
2. **Toàn bộ chữ hiển thị là tiếng Việt có dấu.** Đơn vị và ký hiệu hoá học giữ nguyên (mg/L, NH₃, CO₂).
3. TypeScript strict. Không thêm thư viện runtime mới.
4. Không sửa `public/models.json`, `assets-src/`, `tools/`.
5. Mỗi công thức mới có chú thích một dòng ghi nguồn.

## Việc cần làm

### 1. Hệ carbonat đầy đủ (`chemistry.ts`)
- Hằng số K₁, K₂ theo Millero (2010) cho nước mặn. Nước ngọt (S = 0) dùng dạng nước ngọt của cùng nguồn hoặc Harned. Ghi rõ thang pH đang dùng.
- Nước mặn: thêm kiềm borat (tổng bo theo độ mặn, K_B theo Dickson 1990) và kiềm nước (K_W).
- Hàm `solvePH(TA, CO2aq, T, S)`: giải pH bằng chia đôi. Đầu vào TA tính bằng mg/L CaCO₃, CO₂ tính bằng mg/L.
- Các hàm `dic(...)` và `co2FromDIC(TA, DIC, T, S)`.
- Hàm `bufferBeta(TA, CO2, T, S)`, đơn vị mg/L CaCO₃ cho mỗi đơn vị pH.
- Ω canxit dùng CO₃²⁻ từ hệ mới.

### 2. Khử CO₂ trung hoà kiềm (`process.ts`)
Khi tháp khử khí, tách đạm hay MBBR thổi CO₂ đi, TA giữ nguyên còn DIC giảm. Phải giải lại CO₂ tự do từ (TA, DIC mới), không trừ thẳng CO₂ như bản nền. Lưu ý từ iRAS: CO₂ tự do giảm ít hơn lượng bị thổi, vì bicarbonat chuyển ngược thành CO₂.

### 3. Thêm chất hữu cơ hoà tan (COD hoà tan, ký hiệu DOM)
- Thêm trường `dom` (mg/L) vào `Water`.
- Tải `dom = 10% × thức ăn`.
- Tách đạm khử DOM trên nhánh với hiệu suất 40% một lượt. Có tuỳ chọn ozone nâng lên 70%; ozone còn ôxy hoá một phần NO₂⁻.
- Cộng thêm nhu cầu ôxy dị dưỡng tỉ lệ với TSS và DOM trong bể nuôi. Ghi hệ số dùng.

### 4. Tải giờ cao điểm
- Thêm `peakFactor` (mặc định 1.5).
- `report()` trả cả giá trị trung bình ngày và giờ cao điểm cho TAN, O₂, CO₂.
- Côn ôxy và gió MBBR định cỡ theo giờ cao điểm.

### 5. Thứ tự tuyến theo README iRAS
Bể nuôi → RDF → tách đạm → MBBR → khử CO₂ → bơm → côn ôxy → UV. Nhánh khử nitrat vẫn đi riêng. Cập nhật `UNIT_ORDER`, `passChain` và mọi chỗ trong UI hay scene phụ thuộc thứ tự này.

### 6. MBBR: phân biệt giới hạn diện tích và giới hạn thuỷ lực
`report().biofilter.limitedBy` nhận một trong hai giá trị `"diện tích giá thể"` hoặc `"lưu lượng"`. Giá trị thứ hai áp dụng khi hiệu suất một lượt chạm trần 85%. Hiển thị trong `UnitDetail`.

### 7. Tổng áp khí hoà tan (TGP)
- Ước tính TGP% sau côn ôxy, chấp nhận gần đúng theo áp riêng O₂.
- Cảnh báo khi TGP > 102%, vì nguy cơ bệnh bọt khí.
- Hiển thị TGP trong chi tiết côn ôxy và trong cảnh báo.

### 8. Giao diện
- Chuỗi dọc tuyến hiển thị thêm DOM và TGP.
- Chi tiết thiết bị hiển thị β, chỉ số giới hạn MBBR, giá trị trung bình và cao điểm.
- Tham số mới (ozone, peakFactor) có điều khiển trong `ParamsPanel`, nhãn tiếng Việt.

## Tiêu chí nghiệm thu
- `npx tsc --noEmit`, `npm test` và `npm run build` đều đạt.
- 12 test cũ vẫn đạt. Nếu buộc phải đổi kỳ vọng của một test cũ, giải thích trong báo cáo.
- Thêm ít nhất các test sau:
  - pH từ `solvePH` ở S = 0 lệch không quá 0.03 so với Henderson–Hasselbalch khi pH < 8.3.
  - Nước biển (S = 35, 25 °C, TA ≈ 2300 µmol/kg ≈ 115 mg/L CaCO₃, CO₂ ≈ 10 µmol/kg) cho pH trong khoảng 8.0–8.2.
  - Khử CO₂ trung hoà kiềm: TA không đổi, CO₂ tự do giảm ít hơn lượng CO₂ bị thổi.
  - β > 0, và β tăng khi TA tăng.
  - Bật ozone thì DOM thấp hơn.
  - Côn ôxy 150% bão hoà làm TGP > 102% và sinh cảnh báo.
  - MBBR thiếu giá thể cho `limitedBy = "diện tích giá thể"`; thừa giá thể nhưng lưu lượng thấp cho `"lưu lượng"`.
- Trạng thái ổn định mặc định cho cua: TAN < 1.0 mg/L, DO > 4.5 mg/L.

## Báo cáo khi xong
- Danh sách file đã sửa.
- Công thức và nguồn của từng phần mới.
- Kết quả ba lệnh kiểm tra.
- Những gì chưa làm được và lý do.

Không commit. Claude sẽ nghiệm thu rồi mới commit.
