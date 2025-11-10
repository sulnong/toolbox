/**
 * 转换器模块导出
 */

// PDF转图像转换器
export class PDFToImageConverter {
  async convert(inputPath: string, outputPath: string, options?: any): Promise<any> {
    throw new Error('PDF转图像功能尚未实现');
  }
}

// 图像转PDF转换器
export class ImageToPDFConverter {
  async convert(inputPaths: string[], outputPath: string, options?: any): Promise<any> {
    throw new Error('图像转PDF功能尚未实现');
  }
}

// 批量转换器
export class BatchConverter {
  async convert(inputDir: string, outputDir: string, options?: any): Promise<any> {
    throw new Error('批量转换功能尚未实现');
  }
}
