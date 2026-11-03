# T4 · Thiết kế mô hình: hệ kệ hộp nuôi cua và bóc tách vật tư

Người giao: Claude (giám sát). Người làm: Codex. Repo `D:\GitSource\ras-digital-twin`, xây trên commit `02c85a4`.

## 1. Mục tiêu

Thêm chức năng **"Thiết kế mô hình"** tại route `/thiet-ke`, cho phép:

1. Chọn số hộp theo chiều ngang (số hộp mỗi tầng) và chiều dọc (số tầng), cùng số kệ và cách xếp kệ.
2. Ghép các hộp thành một hệ kệ nuôi có đường ống cấp nước, ống tràn, ống xả cặn và ống đứng hoàn chỉnh, hiển thị 3D.
3. Phân rã hệ thống thành các thành phần rời rạc để bóc tách số lượng: chiều dài ống theo cỡ, phụ kiện, van và khung kệ cần thi công. Xuất ra bảng và file CSV.
4. Kiểm tra thuỷ lực, để chứng minh đường ống đảm bảo chất lượng nước: lưu lượng mỗi hộp, thời gian thay nước trong hộp, vận tốc trong ống, độ đồng đều phân phối nước giữa các hộp.

## 2. Phân tích nguồn tham khảo (Claude đã đọc)

### 2.1. Hộp nuôi cua Bing Crab House "NEW GEN 5 Jumbo Box"
Nguồn: https://bingcrabhouse.co.id/spesifikasi-box-kepiting/, cùng hai ảnh người dùng gửi (bản vẽ "Spec Produk" và ảnh render vàng).

| Đặc điểm | Giá trị / mô tả | Ý nghĩa cho mô hình |
|---|---|---|
| Vật liệu | Nhựa PP đen, nắp PP 4 màu, nặng 1,4 kg | Màu thân hộp, khối lượng đưa vào tải khung kệ |
| Kích thước ngoài | 43 × 40 × 18 cm (dài × rộng × cao) | Kích thước mặc định, cho phép sửa |
| Cấp nước ("Air Masuk") | Ống cấp nằm ngang, chạy xuyên các rãnh chữ U trên mép hộp, qua cả dãy hộp trên cùng một tầng | Mỗi tầng có một ống góp cấp. Mỗi hộp nhận nước qua một lỗ hoặc vòi nhỏ, tuỳ chọn thêm van |
| Xả cặn ("Pembuangan kotoran sisa pakan/feces") | Ống thứ hai nằm ngang, chạy qua rãnh ở mép sau | Mỗi tầng có một ống góp xả cặn |
| Đáy dốc ("Dasar box miring") | Đáy nghiêng về một hố gom cặn ("Endapan kotoran") có lưới chắn | Dựng đáy nghiêng, hố gom có lỗ xả đáy |
| Ống tràn ("Over flow") | Ống đứng bên trong hộp (ảnh thật: ống xanh), giữ mực nước | Mực nước trong hộp = chiều cao ống tràn |
| Ống xả đáy | Ảnh render: ống chữ Z từ lỗ đáy ra phía sau hộp | Nối hố gom cặn với ống góp xả cặn. Tuỳ chọn van xả cặn cho từng hộp (bản GEN 5 "auto back wash") |
| Cửa và khoá xếp chồng ("Dilengkapi pintu", "Kunci susun apartemen") | Cửa trước có lỗ thoáng; khoá để xếp chồng hộp thành "căn hộ" | Cửa mở được trong 3D; xếp tầng khớp nhau |
| Mật độ | "Hemat lahan: 1000 ekor 6×11 m" | Kiểm tra đối chiếu: khoảng 15 con/m² sàn |

### 2.2. Lưu lượng cho từng ngăn nuôi
- Louisiana Sea Grant, *Blue Crab Shedding: The Components of Recirculated Systems* (NOAA tài trợ, Award NA18OAR4170355):
  - Khay 3 × 8 ft cần tối thiểu **3 gal/phút**, tức khoảng **5,1 L/phút cho mỗi m² mặt nước**.
  - Hộc chứa (sump) tối thiểu bằng **5 phút** chạy bơm.
  - Thanh phun giúp cấp ôxy.
  - Ống tràn đứng có lưới bao quanh.
  - Bơm là loại ly tâm cột áp thấp, chịu nước mặn.
- Trang của nhà bán hàng chỉ nêu "tối thiểu 1,5 L/phút mỗi hộp", không có căn cứ kỹ thuật. Một số trang ghi tới 20 L/phút nhưng chưa được kiểm chứng.
- Kết luận cho mô hình:
  - Lưu lượng mặc định **1,5 L/phút mỗi hộp**, cho chỉnh trong khoảng 0,5–5 L/phút.
  - Hiện song song mức tối thiểu tính theo diện tích của Louisiana Sea Grant (≈ 0,88 L/phút cho hộp 43 × 40 cm).
  - Ghi rõ trong giao diện rằng đây là giá trị tham khảo, cần đối chiếu với nhà cung cấp hộp.
- https://www.ras-aquaculture.com/vertical-mud-crab-farming là trang bán khoá học, không có số liệu. Trang chỉ xác nhận ba yếu tố cần thiết kế: chọn hộp, hệ lọc, quy trình vận hành.

### 2.3. Cỡ ống theo bộ asset Crabsense_3D (Minecraft mod của dự án)
Ống tràn mặt DN27, ống xả đáy DN34, ống nối drum DN60. Dùng làm giá trị khởi đầu. Codex tự chọn cỡ ống góp và ống đứng theo vận tốc, như mục 4.

## 3. Ràng buộc
- Không chép code iRAS hay waterkit (AGPL-3.0). Chữ hiển thị tiếng Việt có dấu. TypeScript strict. Không thêm thư viện runtime.
- Dùng lại `src/model` (`loads`, `steadyState`…) và phong cách `src/twin`. Dùng `prettier` (`npm run format`).
- Hộp cua dựng lại bằng hình khối (procedural) theo đúng bản vẽ, không dùng asset `crab_box` kiểu Minecraft. Asset cũ giữ nguyên cho trang `/quy-trinh`.
- Tách biệt rõ: **mô hình dữ liệu rời rạc** (`src/design/`, thuần TypeScript, test được) → **cảnh 3D** (`src/design/scene.ts`) → **giao diện** (`src/ui/design/*`).
- Không tạo file tạm trong repo. Trên Windows dùng `npx.cmd` và `npm.cmd`. Không commit.

## 4. Mô hình dữ liệu rời rạc (`src/design/`)

### 4.1. Cấu hình (`RackDesign`)
- Hộp: dài, rộng, cao, độ dốc đáy, chiều cao ống tràn (mặc định 8 cm), khối lượng 1,4 kg.
- Kệ:
  - số hộp mỗi tầng `cols`, số tầng `tiers`, số kệ `racks`;
  - kiểu bố trí: một dãy, hai dãy quay lưng vào nhau dùng chung ống xả, hoặc nhiều dãy song song có lối đi;
  - khe giữa các hộp, khoảng cách tầng, chiều cao tầng thấp nhất so với sàn, bề rộng lối đi.
- Thuỷ lực:
  - lưu lượng mỗi hộp;
  - kiểu cấp cho hộp: lỗ định lượng hoặc van bi nhỏ từng hộp;
  - van xả cặn từng hộp (có/không);
  - van chặn mỗi tầng (có/không);
  - vật liệu ống (uPVC); cột áp dư tại vòi; chiều dài ống từ kệ tới phòng lọc.

### 4.2. Phân rã thành phần
Hàm `decompose(design)` trả danh sách thành phần rời rạc, mỗi thành phần có `id`, `type`, `dn`, `length` hoặc `count`, vị trí 3D, `rack`, `tier`, `col` và `system`. `system` nhận một trong các giá trị: `cấp`, `tràn`, `xả cặn`, `ống đứng cấp`, `ống đứng thoát`, `ống chính`, `khung`.

Mạng ống chuẩn:
- **Cấp:** ống chính từ bơm → ống đứng cấp ở đầu mỗi kệ → van chặn tầng → ống góp cấp mỗi tầng chạy qua rãnh trên mép hộp → lỗ hoặc vòi, cộng van nếu chọn, cho từng hộp → nút bịt cuối ống góp.
- **Tràn:** ống tràn đứng trong hộp → ống góp tràn mỗi tầng ở phía sau → ống đứng thoát.
- **Xả cặn:** lỗ đáy hố gom → ống chữ Z → van xả cặn nếu chọn → ống góp xả cặn mỗi tầng → ống đứng thoát.
- **Thoát:** ống đứng thoát ở cuối mỗi kệ → ống chính thoát dưới sàn có độ dốc → về lọc trống.
- **Khung:** cột, thanh đỡ tầng, giằng chéo. Có thể ước theo số mét thép hộp.

Hàm `bom(components)` gom theo loại và cỡ:
- Ống thẳng: tổng mét, và số cây chuẩn 4 m làm tròn lên, kèm 5% hao hụt.
- Phụ kiện: tê, co 90°, co 45°, nút bịt, côn thu, rắc co.
- Van: van chặn tầng, van từng hộp, van xả cặn.
- Vòi hoặc lỗ định lượng.
- Kẹp ống, khoảng 1 cái mỗi 1 m ống ngang.
- Khung kệ.

Có test đếm cho cấu hình nhỏ đếm tay được, ví dụ 1 kệ × 2 tầng × 3 hộp. Số tê, co, van và mét ống phải khớp với phép đếm tay viết trong chú thích của test.

### 4.3. Kiểm tra thuỷ lực
Hàm `hydraulics(design)` tính:
- **Tổng lưu lượng:** Q = số hộp × q hộp. So với ngưỡng sump ≥ 5 phút chạy bơm (Louisiana Sea Grant).
- **Thời gian thay nước trong mỗi hộp:** thể tích nước hộp ÷ q hộp. Cảnh báo khi quá 15 phút. Ngưỡng này là giả định minh hoạ, ghi rõ.
- **Chọn cỡ ống:**
  - Ống áp lực (cấp): vận tốc 0,6–1,5 m/s.
  - Ống tự chảy (tràn, xả cặn, thoát): chảy nửa ống theo Manning, n ≈ 0,009 cho PVC, ứng với độ dốc đã chọn. Vận tốc 0,6–1 m/s để tự làm sạch.
  - Dãy DN tiêu chuẩn: 21, 27, 34, 42, 49, 60, 90, 114 (đường kính ngoài uPVC theo TCVN/ISO). Ghi nguồn đường kính trong.
- **Tổn thất cột áp ống cấp:** Hazen–Williams, C = 150 cho PVC, cộng tổn thất cục bộ theo phụ kiện. Kết quả là cột áp bơm cần thiết = độ cao tầng trên cùng + tổn thất + cột áp dư tại vòi.
- **Độ đồng đều phân phối giữa các hộp trên một ống góp:**
  - Ước tính chênh lưu lượng giữa hộp đầu và hộp cuối từ tỉ số cột áp vận tốc của ống góp so với tổn thất qua lỗ hoặc vòi.
  - Tiêu chí phổ biến: tổn thất qua lỗ ≥ 10 lần cột áp vận tốc trong ống góp thì chênh dưới khoảng 5%. Ghi nguồn tài liệu thuỷ lực ống góp.
  - Đưa ra chỉ số đồng đều (%). Cảnh báo khi dưới 90%, kèm gợi ý: tăng cỡ ống góp, cấp nước từ hai đầu, hoặc dùng van từng hộp.
- **Nối với mô hình hoá nước:** tổng số hộp đưa vào `defaultParams("mud-crab")` thay cho `units`, với lưu lượng = Q. Hiện TAN, DO và NH₃ tự do ở trạng thái ổn định. Thêm nút "Mở trong Quy trình" sang `/quy-trinh` mang sẵn số hộp và lưu lượng qua query.

## 5. Cảnh 3D (`src/design/scene.ts`)
- **Hộp cua dựng hình khối theo bản vẽ:** thân, rãnh chữ U trên mép, đáy nghiêng về hố gom, lưới hố gom, ống tràn đứng, ống chữ Z dưới đáy, cửa trước có lỗ và bản lề. Dùng InstancedMesh khi số hộp lớn. Phải chạy mượt ở 1000 hộp, ví dụ 5 kệ × 8 tầng × 25 hộp.
- **Ống:** màu theo hệ thống, kèm chú giải. Cấp xanh lam, tràn xanh lục, xả cặn nâu, ống đứng và ống chính đậm hơn. Van có ký hiệu tay gạt đỏ.
- **Các lớp bật/tắt được:** hộp, khung, cấp, tràn, xả cặn, ống đứng, nước.
- **Chế độ "Tách rời":** hộp, ống góp và ống đứng tách ra theo phương ngang hoặc dọc, để thấy từng thành phần.
- **Chọn thành phần:** bấm vào một đoạn ống, van hoặc hộp thì hiện `id`, loại, DN, chiều dài, lưu lượng qua và vận tốc. Dòng tương ứng trong bảng vật tư được làm nổi bật. Ngược lại, bấm một dòng trong bảng thì làm nổi bật mọi thành phần thuộc dòng đó trong 3D.
- **Hình động dòng nước:** hạt chạy trong ống theo chiều và tốc độ tương đối với lưu lượng thực. Nước rơi vào hộp tại vòi cấp.
- **Chế độ "Một hộp":** xem riêng một hộp cỡ lớn, có cắt lớp, chú thích bộ phận đúng bản vẽ như cấp nước, xả cặn, hố gom, đáy dốc, ống tràn, cửa, khoá xếp chồng. Hình động mực nước dâng tới ống tràn và cặn trượt về hố gom.
- **Một renderer mỗi trang.** Tạo canvas mới mỗi lần gắn, giống cách đã sửa ở T2b.

## 6. Giao diện `/thiet-ke`
- **Cột trái:** cấu hình, nhóm theo hộp, kệ, thuỷ lực và tuỳ chọn van. Thay đổi là cập nhật ngay.
- **Giữa:** cảnh 3D cùng thanh lớp, nút tách rời, nút một hộp, nút toàn cảnh.
- **Phải hoặc dưới:**
  - Tóm tắt: tổng hộp, tổng con, diện tích sàn, Q, cột áp bơm, chỉ số đồng đều, thời gian thay nước, TAN, DO, NH₃ trạng thái ổn định.
  - Cảnh báo.
  - Bảng vật tư (BOM) gom theo hệ thống, gồm các cột: hạng mục, quy cách, đơn vị, số lượng, ghi chú.
  - Nút "Tải CSV" (UTF-8 có BOM để Excel đọc đúng tiếng Việt) và nút "Tải JSON cấu hình".
- **Thêm "Thiết kế" vào thanh điều hướng.** Trang chủ thêm một thẻ dẫn tới `/thiet-ke`.
- **Responsive tới 375 px, không tràn ngang.**

## 7. Tiêu chí nghiệm thu
- `npx.cmd tsc --noEmit`, `npm.cmd test` và `npm.cmd run build` đều đạt. Bộ tự kiểm cũ vẫn 48/48.
- Có test cho `decompose`, `bom` và `hydraulics`. Test đếm tay cho cấu hình 1 × 2 × 3, và cho trường hợp đổi từng tuỳ chọn van. Có test Hazen–Williams với một giá trị đối chiếu tài liệu. Có test chỉ số đồng đều giảm khi ống góp dài hơn hoặc cỡ nhỏ hơn.
- Cấu hình 5 kệ × 8 tầng × 25 hộp (1000 hộp) render được và xoay mượt.
- CSV mở được, cột khớp với bảng trên màn hình.
- Đổi số hộp hoặc số tầng thì 3D, bảng vật tư và thuỷ lực cùng cập nhật.

## 7b. Bổ sung (giao cùng đợt sửa sau nghiệm thu)

Nguồn: catalog Guangdong ZKAQUA, https://zkaqua.en.made-in-china.com/product-group/XqTtpjkbZLVc/Crab-Box-catalog-1.html (Claude đã đọc).

- **Mẫu hộp có sẵn để chọn**, kích thước vẫn sửa tay được:
  - "Bing Crab House NEW GEN 5 Jumbo": 43 × 40 × 18 cm, PP, 1,4 kg.
  - "ZKAQUA Mud Crab Box": 42 × 33 × 18,5 cm, PE. Trang không ghi khối lượng, nên để trống và cho người dùng nhập.
- **Ước tính chi phí trong bảng vật tư:**
  - Thêm cột đơn giá và thành tiền.
  - Đơn giá mặc định của hộp lấy theo giá FOB ZKAQUA US$5,5–7,3 mỗi hộp, hiển thị khoảng giá. Ghi rõ là giá FOB tham khảo, chưa gồm vận chuyển và thuế.
  - Đơn giá ống, phụ kiện và van do người dùng nhập, có giá trị mẫu ghi chú "nhập theo báo giá địa phương".
  - Có tổng tiền theo từng hệ thống và tổng cộng. Chọn được đơn vị USD hoặc VND, tỉ giá do người dùng nhập.
- Catalog không có số liệu lưu lượng hay đường ống. Không lấy thêm thông số nào từ nguồn này.

## 8. Báo cáo khi xong
- Danh sách file.
- Mô tả mạng ống chuẩn đã cài.
- Bảng vật tư mẫu cho cấu hình mặc định.
- Các nguồn đã dùng cho thuỷ lực.
- Kết quả ba lệnh kiểm tra.
- Những gì chưa làm được.

Không commit.
