import { useState, useCallback } from 'react';
import { Button, Tooltip, message } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { copyTextToClipboard } from '../../utils/clipboard';

interface CopyButtonProps {
  /** 要复制的文本 */
  text: string;
  /** 按钮大小 */
  size?: 'small' | 'middle' | 'large';
  /** 自定义类名 */
  className?: string;
  /** 复制成功后的提示文本 */
  successText?: string;
  /** 是否显示文字 */
  showText?: boolean;
  /** 按钮上显示的文字 */
  buttonText?: string;
  /** 是否阻止点击事件继续冒泡 */
  stopPropagation?: boolean;
}

/**
 * 复制按钮组件
 * 点击后将文本复制到剪贴板
 */
export function CopyButton({
  text,
  size = 'middle',
  className = '',
  successText = '已复制',
  showText = false,
  buttonText = '复制',
  stopPropagation = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await copyTextToClipboard(text);
      setCopied(true);
      message.success(successText);

      // 2 秒后重置状态
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      message.error('复制失败，请手动复制');
    }
  }, [text, successText]);

  return (
    <Tooltip title={copied ? successText : '复制'}>
      <Button
        type="text"
        size={size}
        icon={copied ? <CheckOutlined /> : <CopyOutlined />}
        onClick={(event) => {
          if (stopPropagation) {
            event.stopPropagation();
          }
          void handleCopy();
        }}
        className={`copy-button ${copied ? 'copied' : ''} ${className}`}
        style={{
          color: copied ? 'var(--color-success)' : undefined,
        }}
      >
        {showText && (copied ? successText : buttonText)}
      </Button>
    </Tooltip>
  );
}
