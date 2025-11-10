/**
 * 解析器模块导出
 */

// 导入已实现的解析器
export { TraditionalPDFParser, ParseOptions, ParseResult, DataSchema } from './traditional-pdf-parser';
export { AIOCRParser, AIROptions, AIResult } from './ai-ocr-parser';

// 解析器管理器（待实现）
export class ParserManager {
  async parseWithFallback(inputPath: string, options?: any): Promise<any> {
    throw new Error('解析器管理功能尚未实现');
  }
}
