export const waterkitGroups = [
  {
    title: "Tính toán thủy lực",
    items: [
      {
        file: "pipe-hydraulic-calculator",
        name: "Thủy lực đường ống",
        description: "Tính lưu lượng, vận tốc và đường kính; tổn thất theo Colebrook–White.",
      },
      {
        file: "pipe-hydraulic-pro",
        name: "Thủy lực đường ống nâng cao",
        description: "Chọn ống, tính tổn thất cục bộ, dòng tự chảy Manning và kiểm tra áp lực PN.",
      },
      {
        file: "open-channel-calculator",
        name: "Thủy lực kênh hở",
        description: "Tính mặt cắt, độ sâu phân giới và số Froude theo Manning.",
      },
      {
        file: "weir-flow-calculator",
        name: "Dòng chảy qua đập tràn",
        description: "Tính lưu lượng qua đập chữ nhật, tam giác, hình thang và đỉnh rộng.",
      },
      {
        file: "orifice-nozzle-calculator",
        name: "Dòng chảy qua lỗ và vòi",
        description: "Tính lưu lượng qua lỗ, vòi và thời gian tháo nước.",
      },
    ],
  },
  {
    title: "Tính toán công nghệ",
    items: [
      {
        file: "aeration-calculator",
        name: "Lưu lượng khí sục",
        description: "Tính nhu cầu oxy AOR/SOR, hiệu chỉnh α–β và nitrat hóa.",
      },
      {
        file: "sludge-production-calculator",
        name: "Lượng bùn phát sinh",
        description: "Ước tính bùn sinh học, hóa học, sơ cấp và chi phí xử lý.",
      },
      {
        file: "dosing-calculator",
        name: "Liều lượng hóa chất",
        description: "Tính liều cho sáu nhóm hóa chất xử lý nước.",
      },
      {
        file: "activated-sludge-process-calculator",
        name: "Công nghệ bùn hoạt tính",
        description: "Tính bể AAO, A/O, SBR, tuần hoàn và oxy; tham khảo HJ 576.",
        beta: true,
      },
      {
        file: "mbbr-design",
        name: "Thiết kế MBBR",
        description: "Tính các giai đoạn MBBR và lựa chọn giá thể.",
        beta: true,
      },
      {
        file: "ifas-design",
        name: "Thiết kế IFAS",
        description: "Tính bể kết hợp bùn hoạt tính và màng sinh học trên giá thể.",
        beta: true,
      },
      {
        file: "mbr-design",
        name: "Thiết kế MBR",
        description: "Tính thể tích bể, diện tích màng, vệ sinh và năng lượng; tham khảo HJ 2010.",
        beta: true,
      },
      {
        file: "ro-design",
        name: "Thẩm thấu ngược RO",
        description: "Mô phỏng từng phần tử màng, RO hai cấp và thu hồi năng lượng.",
        beta: true,
      },
    ],
  },
  {
    title: "Lựa chọn thiết bị",
    items: [
      {
        file: "pump-selection-calculator",
        name: "Lựa chọn bơm",
        description: "Tính cột áp, công suất trục và kiểm tra NPSH.",
      },
      {
        file: "blower-selection-calculator",
        name: "Lựa chọn máy thổi khí",
        description: "Tính công suất nén đoạn nhiệt và hiệu chỉnh độ cao.",
      },
    ],
  },
  {
    title: "Chuyển đổi cơ bản",
    items: [
      {
        file: "water-quality-unit-converter",
        name: "Chuyển đổi đơn vị chất lượng nước",
        description: "Chuyển đổi độ cứng, độ kiềm, pH, nitơ, phospho và ion.",
      },
    ],
  },
  {
    title: "Nuôi trồng thủy sản",
    items: [
      {
        file: "tailwater",
        name: "Xử lý nước thải ao nuôi",
        description: "Cân bằng khối lượng nitơ, phospho và đối chiếu tiêu chuẩn xả thải theo tỉnh.",
      },
      {
        file: "aquanor-2027-guide-cn",
        name: "Hướng dẫn Aqua Nor 2027",
        description: "Lập kế hoạch tham quan triển lãm thủy sản tại Trondheim.",
      },
    ],
  },
];

export const waterkitUrl = (file: string) => `${import.meta.env.BASE_URL}waterkit/${file}.html`;
