/**
 * 解析器模块导出
 */

// 传统PDF解析器
export class TraditionalPDFParser {
  async parse(inputPath: string): Promise<any> {
    throw new Error('传统PDF解析功能尚未实现');
  }
}

// AI OCR解析器
export class AIOCRParser {
  async parse(inputPath: string, options?: any): Promise<any> {
    throw new Error('AI OCR解析功能尚未实现');
  }
}

// 解析器管理器
export class ParserManager {
  async parseWithFallback(inputPath: string, options?: any): Promise<any> {
    throw new Error('解析器管理功能尚未实现');
  }
}
