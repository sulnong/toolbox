import * as fs from 'fs/promises';
import * as path from 'path';
import { CheckpointData, StargazerUser } from './types';

/**
 * 检查点管理器
 */
export class CheckpointManager {
  private static readonly CHECKPOINT_DIR = './checkpoints';
  private static readonly CHECKPOINT_EXTENSION = '.checkpoint.json';

  /**
   * 获取检查点文件路径
   */
  static getCheckpointPath(repository: string): string {
    const sanitizedName = repository.replace(/[\/\\:]/g, '_');
    return path.join(this.CHECKPOINT_DIR, `${sanitizedName}${this.CHECKPOINT_EXTENSION}`);
  }

  /**
   * 确保检查点目录存在
   */
  private static async ensureCheckpointDir(): Promise<void> {
    try {
      await fs.access(this.CHECKPOINT_DIR);
    } catch {
      await fs.mkdir(this.CHECKPOINT_DIR, { recursive: true });
    }
  }

  /**
   * 保存检查点
   */
  static async saveCheckpoint(checkpoint: CheckpointData): Promise<void> {
    await this.ensureCheckpointDir();
    const checkpointPath = this.getCheckpointPath(checkpoint.repository);

    const checkpointData = {
      ...checkpoint,
      lastUpdateTime: Date.now(),
    };

    await fs.writeFile(checkpointPath, JSON.stringify(checkpointData, null, 2));
  }

  /**
   * 加载检查点
   */
  static async loadCheckpoint(repository: string): Promise<CheckpointData | null> {
    const checkpointPath = this.getCheckpointPath(repository);

    try {
      const data = await fs.readFile(checkpointPath, 'utf8');
      return JSON.parse(data) as CheckpointData;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null; // 检查点文件不存在
      }
      console.warn(`⚠️ 加载检查点失败:`, error.message);
      return null;
    }
  }

  /**
   * 检查是否存在检查点
   */
  static async hasCheckpoint(repository: string): Promise<boolean> {
    const checkpointPath = this.getCheckpointPath(repository);
    try {
      await fs.access(checkpointPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 删除检查点
   */
  static async deleteCheckpoint(repository: string): Promise<void> {
    const checkpointPath = this.getCheckpointPath(repository);

    try {
      await fs.unlink(checkpointPath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.warn(`⚠️ 删除检查点失败:`, error.message);
      }
    }
  }

  /**
   * 创建初始检查点
   */
  static createInitialCheckpoint(
    repository: string,
    totalStargazers: number,
    outputFormat: 'csv' | 'json',
    outputFile?: string
  ): CheckpointData {
    return {
      repository,
      processedUsers: [],
      completedUsers: [],
      totalStargazers,
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      outputFormat,
      outputFile,
    };
  }

  /**
   * 获取所有检查点
   */
  static async listCheckpoints(): Promise<string[]> {
    try {
      await this.ensureCheckpointDir();
      const files = await fs.readdir(this.CHECKPOINT_DIR);
      return files
        .filter((file) => file.endsWith(this.CHECKPOINT_EXTENSION))
        .map((file) => file.replace(this.CHECKPOINT_EXTENSION, '').replace(/_/g, '/'));
    } catch {
      return [];
    }
  }

  /**
   * 清理旧的检查点
   */
  static async cleanupOldCheckpoints(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      await this.ensureCheckpointDir();
      const files = await fs.readdir(this.CHECKPOINT_DIR);
      const now = Date.now();

      for (const file of files) {
        if (!file.endsWith(this.CHECKPOINT_EXTENSION)) {
          continue;
        }

        const filePath = path.join(this.CHECKPOINT_DIR, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          console.log(`🗑️ 清理旧检查点: ${file}`);
        }
      }
    } catch (error) {
      console.warn('⚠️ 清理检查点失败:', error);
    }
  }

  /**
   * 计算进度百分比
   */
  static calculateProgress(checkpoint: CheckpointData): number {
    if (checkpoint.totalStargazers === 0) {
      return 100;
    }
    return Math.round((checkpoint.processedUsers.length / checkpoint.totalStargazers) * 100);
  }

  /**
   * 获取处理速度统计
   */
  static getProcessingStats(checkpoint: CheckpointData): {
    elapsed: number;
    rate: number;
    eta: number;
  } {
    const now = Date.now();
    const elapsed = now - checkpoint.startTime;
    const processed = checkpoint.processedUsers.length;

    const rate = elapsed > 0 ? processed / (elapsed / 1000) : 0; // users per second
    const remaining = checkpoint.totalStargazers - processed;
    const eta = rate > 0 ? remaining / rate : 0; // seconds

    return {
      elapsed,
      rate,
      eta,
    };
  }
}