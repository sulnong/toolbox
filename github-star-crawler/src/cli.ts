#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { GitHubStarCrawler } from './crawler';
import { DataExporter } from './exporter';
import { CrawlerConfig, OutputOptions } from './types';

/**
 * 主程序入口
 */
async function main(): Promise<void> {
  const program = new Command();

  program
    .name('github-star-crawler')
    .description('一个合规的 GitHub 工具，用于获取公开仓库的 star 用户邮箱信息')
    .version('1.0.0');

  program
    .argument('<repository>', 'GitHub 仓库 (格式: owner/repo)')
    .option('-f, --format <format>', '输出格式 (csv|json)', 'csv')
    .option('-o, --output <filename>', '输出文件名')
    .option('-d, --delay <milliseconds>', '请求间隔延迟 (毫秒)', '1000')
    .option('--stats-only', '仅显示统计信息，不导出数据')
    .option('-v, --verbose', '详细输出')
    .option('--timeout <milliseconds>', '请求超时时间 (毫秒)', '30000')
    .option('--max-retries <count>', '最大重试次数', '3')
    .addHelpText(
      'after',
      `
示例:
  $ github-star-crawler microsoft/vscode
  $ github-star-crawler facebook/react --format json
  $ github-star-crawler torvalds/linux --output linux-users.csv --verbose
  $ github-star-crawler owner/repo --stats-only

环境变量:
  GITHUB_TOKEN    GitHub 个人访问令牌 (推荐配置)

合规性声明:
  • 本工具仅访问 GitHub 上的公开信息
  • 遵守 GitHub API 使用条款和速率限制
  • 尊重用户隐私设置
  • 请勿将收集的邮箱用于垃圾邮件

获取 GitHub Token:
  https://github.com/settings/tokens`
    )
    .action(async (repository, options) => {
      try {
        await runCrawler(repository, options);
      } catch (error: any) {
        console.error(chalk.red('❌ 错误:'), error.message);
        process.exit(1);
      }
    });

  program.parse();
}

/**
 * 运行爬虫
 */
async function runCrawler(repository: string, options: any): Promise<void> {
  // 显示合规声明
  displayComplianceNotice();

  // 验证仓库格式
  const repoInfo = GitHubStarCrawler.validateRepository(repository);
  if (!repoInfo) {
    throw new Error('仓库格式错误，请使用 owner/repo 格式');
  }

  // 创建配置
  const config: CrawlerConfig = {
    ...GitHubStarCrawler.createDefaultConfig(),
    delay: parseInt(options.delay),
    timeout: parseInt(options.timeout),
    maxRetries: parseInt(options.maxRetries),
    verbose: options.verbose,
  };

  // 创建输出选项
  const outputOptions: OutputOptions = {
    format: options.format as 'csv' | 'json',
    output: options.output,
    statsOnly: options.statsOnly,
    verbose: options.verbose,
  };

  // 验证输出格式
  if (!['csv', 'json'].includes(outputOptions.format)) {
    throw new Error('不支持的输出格式，请使用 csv 或 json');
  }

  // 检查 GitHub token
  if (!config.token) {
    console.log(chalk.yellow('⚠️ 未检测到 GitHub Token，API 速率限制为 60 次/小时'));
    console.log(chalk.yellow('💡 建议配置 GITHUB_TOKEN 环境变量以获得更高限制 (5000 次/小时)'));
    console.log();
  }

  // 验证输出路径
  if (outputOptions.output && !(await DataExporter.validateOutputPath(outputOptions.output))) {
    throw new Error('无法创建输出文件路径');
  }

  // 创建爬虫实例
  const crawler = new GitHubStarCrawler(config);

  // 执行爬取
  const result = await crawler.crawlRepository(repoInfo.owner, repoInfo.name, outputOptions);

  // 导出数据
  if (!outputOptions.statsOnly) {
    await DataExporter.exportToFile(result, outputOptions);
  } else {
    DataExporter.displayStats(result);
  }

  // 显示完成信息
  console.log(chalk.green('\\n🎉 爬取完成！'));
}

/**
 * 显示合规声明
 */
function displayComplianceNotice(): void {
  console.log(chalk.blue('🛡️ 合规性声明:'));
  console.log(chalk.gray('   • 本工具仅访问 GitHub 上的公开信息'));
  console.log(chalk.gray('   • 遵守 GitHub API 使用条款和速率限制'));
  console.log(chalk.gray('   • 尊重用户隐私设置'));
  console.log(chalk.gray('   • 请勿将收集的邮箱用于垃圾邮件'));
  console.log();
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('❌ 未处理的 Promise 拒绝:'), reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('❌ 未捕获的异常:'), error);
  process.exit(1);
});

// 运行主程序
if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('❌ 程序执行失败:'), error);
    process.exit(1);
  });
}

export { main };
