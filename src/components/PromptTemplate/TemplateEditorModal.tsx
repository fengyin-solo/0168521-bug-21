import { useEffect } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import type { PromptTemplate, CreatePromptTemplateParams } from '../../types';
import { DEFAULT_CATEGORIES } from '../../types';

interface TemplateEditorModalProps {
  open: boolean;
  template: PromptTemplate | null;
  onClose: () => void;
  /** 返回 true 表示保存成功（弹窗关闭）；false 表示保存失败，保留弹窗与表单 */
  onSave: (params: CreatePromptTemplateParams) => boolean;
}

export function TemplateEditorModal({ open, template, onClose, onSave }: TemplateEditorModalProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    // 先整体重置，避免 undefined 字段被 setFieldsValue 跳过而残留上一份的值
    form.resetFields();
    if (template) {
      form.setFieldsValue({
        name: template.name,
        description: template.description,
        category: template.category,
        content: template.content,
      });
    } else {
      form.setFieldsValue({ category: '通用' });
    }
    // 仅在打开或编辑目标切换时同步，编辑期间外部数据变化不顶掉用户输入
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template?.id]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const ok = onSave(values);
      if (!ok) return; // 保存失败：保留表单与上一份数据，允许用户重试
      onClose();
    } catch {
      message.error('请填写完整信息');
    }
  };

  return (
    <Modal
      title={template ? '编辑模板' : '新建模板'}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      width={600}
      okText="保存"
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="name"
          label="模板名称"
          rules={[{ required: true, message: '请输入模板名称' }]}
        >
          <Input placeholder="例如：代码优化助手" maxLength={50} showCount />
        </Form.Item>

        <Form.Item
          name="description"
          label="模板描述"
        >
          <Input placeholder="简短描述模板的用途" maxLength={100} showCount />
        </Form.Item>

        <Form.Item
          name="category"
          label="分类"
          rules={[{ required: true, message: '请选择分类' }]}
        >
          <Select
            placeholder="选择分类"
            allowClear
            options={DEFAULT_CATEGORIES.map((cat) => ({
              label: cat,
              value: cat,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="content"
          label="提示词内容"
          rules={[{ required: true, message: '请输入提示词内容' }]}
        >
          <Input.TextArea
            placeholder="输入提示词模板内容，使用 {{变量名}} 作为占位符"
            rows={8}
            maxLength={2000}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
