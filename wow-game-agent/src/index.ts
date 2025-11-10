#!/usr/bin/env node

/**
 * 魔兽世界游戏助手主入口文件
 * 提供命令行界面和核心功能初始化
 */

import { program } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { GameAgent } from '@/core/game-agent';
import { logger } from '@/utils/logger';
import { GameAgentError } from '@/types';

// 加载环境变量
dotenv.config();

// 版本信息
const VERSION = '1.0.0';

// 错误处理
process.on('uncaughtException', (error: Error) => {
  logger.error('未捕获的异常:', error);
  if (error instanceof GameAgentError) {
    console.error(chalk.red(`[${error.category.toUpperCase()}] ${error.code}: ${error.message}`));
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('未处理的 Promise 拒绝:', reason);
  console.error(chalk.red('未处理的异步错误:', reason));
  process.exit(1);
});

/**
 * 主程序配置
 */
program
  .name('wow-agent')
  .description('🔒 合规安全的魔兽世界游戏助手')
  .version(VERSION, '-v, --version', '显示版本信息');

/**
 * 启动游戏助手
 */
program
  .command('start')
  .description('启动游戏助手')
  .option('-s, --scenario <name>', '指定场景 (fishing, login, navigation)', 'fishing')
  .option('-c, --config <path>', '配置文件路径', './config/default.json')
  .option('--no-safety', '禁用安全检查 (不推荐)')
  .option('--debug', '启用调试模式')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🎮 魔兽世界游戏助手启动中...'));
      console.log(chalk.yellow('⚠️  请确保遵守游戏用户条款，合理使用辅助功能\n'));

      const agent = new GameAgent({
        scenario: options.scenario,
        configPath: options.config,
        safetyEnabled: options.safety,
        debugMode: options.debug
      });

      await agent.initialize();
      await agent.start();

      // 处理优雅关闭
      process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n🛑 正在安全关闭...'));
        await agent.stop();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        console.log(chalk.yellow('\n🛑 收到终止信号，正在关闭...'));
        await agent.stop();
        process.exit(0);
      });

    } catch (error) {
      if (error instanceof GameAgentError) {
        console.error(chalk.red(`❌ [${error.category.toUpperCase()}] ${error.message}`));
      } else {
        console.error(chalk.red('❌ 启动失败:', error));
      }
      process.exit(1);
    }
  });

/**
 * 状态检查
 */
program
  .command('status')
  .description('显示助手运行状态')
  .option('--detailed', '显示详细信息')
  .action(async (options) => {
    try {
      const agent = new GameAgent();
      await agent.initialize();
      const status = await agent.getStatus();

      console.log(chalk.blue('📊 助手状态信息:'));
      console.log(`运行状态: ${status.isRunning ? chalk.green('✅ 运行中') : chalk.red('❌ 未运行')}`);
      console.log(`当前场景: ${status.currentScenario || chalk.gray('未设置')}`);
      console.log(`安全等级: ${getSafetyStatusDisplay(status.safetyLevel)}`);
      console.log(`运行时长: ${formatDuration(status.uptime)}`);

      if (options.detailed) {
        console.log(chalk.blue('\n📋 详细信息:'));
        console.log(`会话开始时间: ${status.sessionStartTime.toLocaleString()}`);
        console.log(`操作计数: ${status.operationCount}`);
        console.log(`最后活动: ${status.lastActivity.toLocaleString()}`);

        if (status.alerts.length > 0) {
          console.log(chalk.red('\n⚠️  活跃警报:'));
          status.alerts.forEach(alert => console.log(`  - ${alert}`));
        }
      }

    } catch (error) {
      console.error(chalk.red('❌ 状态检查失败:', error));
      process.exit(1);
    }
  });

/**
 * 安全检查
 */
program
  .command('safety-check')
  .description('执行安全合规性检查')
  .option('--fix', '尝试修复发现的问题')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🔒 执行安全合规性检查...\n'));

      const agent = new GameAgent();
      await agent.initialize();
      const check = await agent.performSafetyCheck();

      if (check.issues.length === 0) {
        console.log(chalk.green('✅ 未发现安全问题'));
      } else {
        console.log(chalk.red(`❌ 发现 ${check.issues.length} 个安全问题:`));
        check.issues.forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue.description} [${issue.severity}]`);
          if (issue.fix && options.fix) {
            console.log(`     💡 建议修复: ${issue.fix}`);
          }
        });
      }

      console.log(`\n安全评分: ${getSafetyScoreDisplay(check.score)}`);

    } catch (error) {
      console.error(chalk.red('❌ 安全检查失败:', error));
      process.exit(1);
    }
  });

/**
 * 配置管理
 */
program
  .command('config')
  .description('配置管理')
  .option('--show', '显示当前配置')
  .option('--validate', '验证配置有效性')
  .option('--reset', '重置为默认配置')
  .action(async (options) => {
    try {
      const agent = new GameAgent();
      await agent.initialize();

      if (options.show) {
        const config = agent.getConfig();
        console.log(chalk.blue('⚙️  当前配置:'));
        console.log(JSON.stringify(config, null, 2));
      }

      if (options.validate) {
        const validation = await agent.validateConfig();
        if (validation.isValid) {
          console.log(chalk.green('✅ 配置验证通过'));
        } else {
          console.log(chalk.red('❌ 配置验证失败:'));
          validation.errors.forEach(error => console.log(`  - ${error}`));
        }
      }

      if (options.reset) {
        console.log(chalk.yellow('⚠️  重置配置功能开发中...'));
      }

    } catch (error) {
      console.error(chalk.red('❌ 配置操作失败:', error));
      process.exit(1);
    }
  });

/**
 * 辅助函数
 */

function getSafetyStatusDisplay(level: string): string {
  switch (level) {
    case 'safe':
      return chalk.green('✅ 安全');
    case 'warning':
      return chalk.yellow('⚠️  警告');
    case 'danger':
      return chalk.red('❌ 危险');
    default:
      return chalk.gray('❓ 未知');
  }
}

function getSafetyScoreDisplay(score: number): string {
  if (score >= 90) {
    return chalk.green(`✅ ${score}/100 (优秀)`);
  } else if (score >= 70) {
    return chalk.yellow(`⚠️  ${score}/100 (良好)`);
  } else if (score >= 50) {
    return chalk.orange(`🟡 ${score}/100 (一般)`);
  } else {
    return chalk.red(`❌ ${score}/100 (需要改进)`);
  }
}

function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`;
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds % 60}秒`;
  } else {
    return `${seconds}秒`;
  }
}

/**
 * 如果没有提供参数，显示帮助信息
 */
if (process.argv.length <= 2) {
  console.log(chalk.blue('🎮 魔兽世界游戏助手 v' + VERSION));
  console.log(chalk.gray('使用 --help 查看可用命令\n'));
  program.outputHelp();
  process.exit(0);
}

// 启动命令行程序
program.parse();

// 导出主要类供其他模块使用
export { GameAgent } from '@/core/game-agent';
export * from '@/types';