#!/usr/bin/env node

// 优先加载环境变量
require('dotenv').config();

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { GitHubStarCrawler } from './crawler';
import { DataExporter } from './exporter';
import { CrawlerConfig, OutputOptions } from './types';

/**
 * 确保输出目录存在
 */
async function ensureOutputDirectory(): Promise<string> {
  const outputDir = './output';
  try {
    await fs.access(outputDir);
  } catch {
    await fs.mkdir(outputDir, { recursive: true });
  }
  return path.resolve(outputDir);
}

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
    .argument('[repository]', 'GitHub 仓库 (格式: owner/repo)')
    .option('-f, --format <format>', '输出格式 (csv|json)', 'csv')
    .option('-o, --output <filename>', '输出文件名')
    .option('-d, --delay <milliseconds>', '请求间隔延迟 (毫秒)', '1000')
    .option('--stats-only', '仅显示统计信息，不导出数据')
    .option('-v, --verbose', '详细输出')
    .option('--timeout <milliseconds>', '请求超时时间 (毫秒)', '30000')
    .option('--max-retries <count>', '最大重试次数', '3')
    .option('--resume', '从中断点继续执行')
    .option('--list-tasks', '列出所有未完成的任务')
    .option('--cleanup', '清理旧的检查点文件')
    .addHelpText(
      'after',
      `
示例:
  $ github-star-crawler microsoft/vscode
  $ github-star-crawler facebook/react --format json
  $ github-star-crawler torvalds/linux --output linux-users.csv --verbose
  $ github-star-crawler owner/repo --stats-only
  $ github-star-crawler owner/repo --resume          # 从断点继续
  $ github-star-crawler --list-tasks                # 列出未完成任务
  $ github-star-crawler --cleanup                   # 清理检查点

环境变量配置 (.env 文件):
  GITHUB_TOKEN=your_github_token_here     # GitHub 个人访问令牌 (推荐)
  DEFAULT_DELAY=1000                      # 默认请求延迟 (毫秒)
  DEFAULT_TIMEOUT=30000                   # 默认超时时间 (毫秒)

合规性声明:
  • 本工具仅访问 GitHub 上的公开信息
  • 遵守 GitHub API 使用条款和速率限制
  • 尊重用户隐私设置
  • 请勿将收集的邮箱用于垃圾邮件
  • 支持断点续传，任务中断后可恢复

获取 GitHub Token:
  https://github.com/settings/tokens`
    )
    .action(async (repository, options) => {
      try {
        // 处理特殊命令
        if (options.listTasks) {
          await listUnfinishedTasks();
          return;
        }

        if (options.cleanup) {
          await cleanupTasks();
          return;
        }

        // 验证必需的仓库参数
        if (!repository) {
          console.error(chalk.red('❌ 错误: 需要指定 GitHub 仓库'));
          program.help();
          return;
        }

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

  // 确保输出目录存在
  const outputDir = await ensureOutputDirectory();

  // 创建配置
  const config: CrawlerConfig = {
    ...GitHubStarCrawler.createDefaultConfig(),
    delay: parseInt(options.delay),
    timeout: parseInt(options.timeout),
    maxRetries: parseInt(options.maxRetries),
    verbose: options.verbose,
  };

  // 显示 token 信息
  if (config.token) {
    console.log(chalk.green('✅ 检测到 GitHub Token，速率限制: 5000 次/小时'));
  } else {
    console.log(chalk.yellow('⚠️ 未检测到 GitHub Token，速率限制: 60 次/小时'));
    console.log(chalk.gray('💡 建议在 .env 文件中配置 GITHUB_TOKEN'));
  }
  console.log();

  // 创建输出选项
  const outputOptions: OutputOptions = {
    format: options.format as 'csv' | 'json',
    output: options.output ? path.join(outputDir, options.output) : undefined,
    statsOnly: options.statsOnly,
    verbose: options.verbose,
  };

  // 验证输出格式
  if (!['csv', 'json'].includes(outputOptions.format)) {
    throw new Error('不支持的输出格式，请使用 csv 或 json');
  }

  // 检查是否有未完成任务且未使用恢复选项
  const hasUnfinished = await GitHubStarCrawler.hasUnfinishedTask(repoInfo.owner + '/' + repoInfo.name);
  if (hasUnfinished && !options.resume) {
    console.log(chalk.yellow('⚠️ 检测到未完成的任务'));
    console.log(chalk.yellow('💡 使用 --resume 选项从中断点继续，或重新开始将覆盖现有进度'));
    console.log();
  }

  // 验证输出路径
  if (outputOptions.output && !(await DataExporter.validateOutputPath(outputOptions.output))) {
    throw new Error('无法创建输出文件路径');
  }

  // 创建爬虫实例
  const crawler = new GitHubStarCrawler(config);

  // 执行爬取
  const result = await crawler.crawlRepository(repoInfo.owner, repoInfo.name, outputOptions, options.resume);

  // 导出数据
  let exportedFile = null;
  if (!outputOptions.statsOnly) {
    exportedFile = await DataExporter.exportToFile(result, outputOptions);
  } else {
    DataExporter.displayStats(result);
  }

  // 显示所有生成的文件
  if (exportedFile) {
    console.log(chalk.blue('\\n📁 生成的文件:'));
    console.log(chalk.gray(`   ${exportedFile}`));
  }

  // 显示输出目录
  console.log(chalk.blue('\\n📂 输出目录:'));
  console.log(chalk.gray(`   ${outputDir}`));

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

/**
   * 列出未完成的任务
   */
async function listUnfinishedTasks(): Promise<void> {
  const tasks = await GitHubStarCrawler.listUnfinishedTasks();

  if (tasks.length === 0) {
    console.log(chalk.green('✅ 没有未完成的任务'));
    return;
  }

  console.log(chalk.blue('📋 未完成的任务:'));
  for (const task of tasks) {
    const hasCheckpoint = await GitHubStarCrawler.hasUnfinishedTask(task);
    if (hasCheckpoint) {
      console.log(chalk.yellow(`   • ${task}`));
    }
  }

  console.log(chalk.gray('\n使用 --resume 选项继续任务:'));
  console.log(chalk.gray('  github-star-crawler owner/repo --resume'));
}

/**
   * 清理检查点
   */
async function cleanupTasks(): Promise<void> {
  console.log(chalk.blue('🧹 清理检查点文件...'));
  await GitHubStarCrawler.cleanupCheckpoints();
  console.log(chalk.green('✅ 清理完成'));
}

export { main };
