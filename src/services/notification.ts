import { UserModel } from '../models/User';

export interface NotificationData {
  type: 'backup_failure' | 'backup_success' | 'system_alert';
  title: string;
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class NotificationService {
  /**
   * Send notification to all admin users
   */
  static async notifyAdmins(notification: NotificationData): Promise<void> {
    try {
      // Get all admin users
      const adminUsersResult = await UserModel.getByRole('admin');
      
      if (!adminUsersResult.success || !adminUsersResult.data) {
        console.error('Failed to get admin users for notification');
        return;
      }

      const adminUsers = adminUsersResult.data;
      
      // Log the notification (in a real system, this would send emails, push notifications, etc.)
      console.log(`[NOTIFICATION] ${notification.type.toUpperCase()}: ${notification.title}`);
      console.log(`Message: ${notification.message}`);
      console.log(`Severity: ${notification.severity}`);
      console.log(`Notifying ${adminUsers.length} admin(s)`);
      
      // In a production system, you would implement actual notification delivery here:
      // - Email notifications
      // - Push notifications
      // - In-app notifications
      // - SMS for critical alerts
      
      // For now, we'll store notifications in a simple log format
      // This could be enhanced to store in database for in-app notifications
      
    } catch (error) {
      console.error('Failed to send admin notification:', error);
    }
  }

  /**
   * Send backup failure notification
   */
  static async notifyBackupFailure(error: string): Promise<void> {
    const notification: NotificationData = {
      type: 'backup_failure',
      title: 'バックアップが失敗しました',
      message: `自動バックアップの実行中にエラーが発生しました: ${error}`,
      timestamp: new Date(),
      severity: 'high'
    };

    await this.notifyAdmins(notification);
  }

  /**
   * Send backup success notification
   */
  static async notifyBackupSuccess(details: string): Promise<void> {
    const notification: NotificationData = {
      type: 'backup_success',
      title: 'バックアップが完了しました',
      message: `データベースのバックアップが正常に完了しました: ${details}`,
      timestamp: new Date(),
      severity: 'low'
    };

    await this.notifyAdmins(notification);
  }

  /**
   * Send system alert notification
   */
  static async notifySystemAlert(title: string, message: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): Promise<void> {
    const notification: NotificationData = {
      type: 'system_alert',
      title,
      message,
      timestamp: new Date(),
      severity
    };

    await this.notifyAdmins(notification);
  }
}