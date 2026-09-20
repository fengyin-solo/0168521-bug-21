import { useState, useEffect } from 'react';
import {
  Drawer,
  Input,
  Button,
  Space,
  Row,
  Col,
  Empty,
  Switch,
  Select,
  Tooltip,
  message,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  FolderOutlined,
  StarOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { usePromptTemplateStore } from '../../stores';
import type { CreatePromptTemplateParams } from '../../types';
import { DEFAULT_CATEGORIES } from '../../types';
import { TemplateCard } from './TemplateCard';
import { TemplateEditorModal } from './TemplateEditorModal';
import { TemplatePreviewModal } from './TemplatePreviewModal';
import './PromptTemplateLibrary.css';

interface PromptTemplateLibraryProps {
  open: boolean;
  onClose: () => void;
  onUseTemplate: (content: string) => void;
}

export function PromptTemplateLibrary({ open, onClose, onUseTemplate }: PromptTemplateLibraryProps) {
  // 弹窗只记录 id，模板对象始终从 store 按 id 派生，
  // 保证卡片、预览、编辑三处读到的是同一份最新数据。
  const templates = usePromptTemplateStore((state) => state.templates);
  const {
    initialized,
    initTemplates,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    toggleFavorite,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    showFavoritesOnly,
    setShowFavoritesOnly,
    resetToDefaults,
    getFilteredTemplates,
    getCategories,
  } = usePromptTemplateStore();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  // 从预览进入编辑时记下，保存/取消后回到预览；从卡片或“新建”进入则不恢复
  const [returnToPreviewId, setReturnToPreviewId] = useState<string | null>(null);

  useEffect(() => {
    if (open && !initialized) {
      initTemplates();
    }
  }, [open, initialized, initTemplates]);

  const editingTemplate =
    editingTemplateId != null
      ? templates.find((t) => t.id === editingTemplateId) ?? null
      : null;
  const previewTemplate =
    previewTemplateId != null
      ? templates.find((t) => t.id === previewTemplateId) ?? null
      : null;

  const filteredTemplates = getFilteredTemplates();
  const categories = getCategories();

  const handleUseTemplate = (content: string) => {
    onUseTemplate(content);
    message.success('模板已应用');
  };

  const handleEditTemplate = (templateId: string) => {
    setEditingTemplateId(templateId);
    setEditorOpen(true);
    if (previewOpen) {
      setReturnToPreviewId(templateId);
      setPreviewOpen(false);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplateId(null);
    setReturnToPreviewId(null);
    setEditorOpen(true);
  };

  const handleSaveTemplate = (params: CreatePromptTemplateParams) => {
    if (editingTemplateId) {
      const ok = updateTemplate(editingTemplateId, params);
      if (!ok) {
        // 落盘失败：不要关弹窗、不要清表单，上一份数据仍在 store 中
        message.error('模板保存失败，原有内容已保留，请稍后重试');
        return false;
      }
      message.success('模板已更新');
    } else {
      const newId = addTemplate(params);
      if (!newId) {
        message.error('模板创建失败，请稍后重试');
        return false;
      }
      message.success('模板已创建');
    }
    return true;
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingTemplateId(null);
    if (returnToPreviewId) {
      // 回到之前的预览弹窗，展示的是 store 中的最新数据
      setPreviewTemplateId(returnToPreviewId);
      setPreviewOpen(true);
      setReturnToPreviewId(null);
    }
  };

  const handleDeleteTemplate = (id: string) => {
    const ok = deleteTemplate(id);
    if (ok) {
      message.success('模板已删除');
      if (previewTemplateId === id) {
        setPreviewOpen(false);
        setPreviewTemplateId(null);
      }
      if (editingTemplateId === id) {
        setEditorOpen(false);
        setEditingTemplateId(null);
      }
    } else {
      message.error('删除失败，模板已保留，请稍后重试');
    }
  };

  const handleToggleFavorite = (id: string) => {
    const ok = toggleFavorite(id);
    if (!ok) {
      message.error('收藏状态更新失败，请稍后重试');
    }
  };

  const handlePreviewTemplate = (templateId: string) => {
    setReturnToPreviewId(null);
    setPreviewTemplateId(templateId);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewTemplateId(null);
  };

  const handleReset = () => {
    const ok = resetToDefaults();
    if (ok) {
      message.success('已重置为默认模板');
      setPreviewOpen(false);
      setPreviewTemplateId(null);
      setEditorOpen(false);
      setEditingTemplateId(null);
    } else {
      message.error('重置失败，当前模板已保留');
    }
  };

  const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories])).sort();

  return (
    <>
      <Drawer
        title="提示词模板库"
        placement="right"
        width={800}
        open={open}
        onClose={onClose}
        className="prompt-template-drawer"
        extra={
          <Space>
            <Tooltip title="重置为默认模板">
              <Button icon={<ReloadOutlined />} onClick={handleReset} size="small">
                重置
              </Button>
            </Tooltip>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateTemplate}>
              新建模板
            </Button>
          </Space>
        }
      >
        <div className="template-library-header">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Input
              placeholder="搜索模板名称、内容或分类..."
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />

            <Space wrap>
              <Space>
                <FolderOutlined />
                <span>分类：</span>
                <Select
                  style={{ width: 150 }}
                  placeholder="全部分类"
                  allowClear
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  options={allCategories.map((cat) => ({ label: cat, value: cat }))}
                />
              </Space>

              <Space>
                <StarOutlined />
                <span>仅收藏：</span>
                <Switch checked={showFavoritesOnly} onChange={setShowFavoritesOnly} size="small" />
              </Space>

              <span className="template-count">
                共 {filteredTemplates.length} 个模板
              </span>
            </Space>
          </Space>
        </div>

        <div className="template-library-content">
          {filteredTemplates.length === 0 ? (
            <Empty
              description="没有找到匹配的模板"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Row gutter={[16, 16]}>
              {filteredTemplates.map((template) => (
                <Col xs={24} sm={12} lg={8} key={template.id}>
                  <TemplateCard
                    template={template}
                    onUse={handleUseTemplate}
                    onEdit={(t) => handleEditTemplate(t.id)}
                    onDelete={handleDeleteTemplate}
                    onToggleFavorite={handleToggleFavorite}
                    onPreview={(t) => handlePreviewTemplate(t.id)}
                  />
                </Col>
              ))}
            </Row>
          )}
        </div>
      </Drawer>

      <TemplateEditorModal
        open={editorOpen}
        template={editingTemplate}
        onClose={closeEditor}
        onSave={handleSaveTemplate}
      />

      <TemplatePreviewModal
        open={previewOpen}
        template={previewTemplate}
        onClose={closePreview}
        onUse={handleUseTemplate}
        onEdit={(t) => handleEditTemplate(t.id)}
        onToggleFavorite={handleToggleFavorite}
      />
    </>
  );
}
