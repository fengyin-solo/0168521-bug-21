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
import type { PromptTemplate, CreatePromptTemplateParams } from '../../types';
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
  const {
    initialized,
    initTemplates,
    templates,
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

  useEffect(() => {
    if (open && !initialized) {
      initTemplates();
    }
  }, [open, initialized]);

  const filteredTemplates = getFilteredTemplates();
  const categories = getCategories();
  const editingTemplate = editingTemplateId
    ? templates.find((template) => template.id === editingTemplateId) ?? null
    : null;
  const previewTemplate = previewTemplateId
    ? templates.find((template) => template.id === previewTemplateId) ?? null
    : null;

  const handleUseTemplate = (content: string) => {
    onUseTemplate(content);
    message.success('模板已应用');
  };

  const handleEditTemplate = (template: PromptTemplate) => {
    setEditingTemplateId(template.id);
    setEditorOpen(true);
  };

  const handleSaveTemplate = (params: CreatePromptTemplateParams) => {
    const saved = editingTemplateId
      ? updateTemplate(editingTemplateId, params)
      : addTemplate(params) !== null;

    if (saved) {
      message.success(editingTemplateId ? '模板已更新' : '模板已创建');
      setEditorOpen(false);
    } else {
      message.error('模板保存失败，已恢复为修改前的内容');
    }

    return saved;
  };

  const handleDeleteTemplate = (id: string) => {
    if (deleteTemplate(id)) {
      message.success('模板已删除');
    } else {
      message.error('模板删除失败，已恢复为删除前的内容');
    }
  };

  const handleToggleFavorite = (id: string) => {
    if (!toggleFavorite(id)) {
      message.error('收藏状态保存失败，已恢复为上一份内容');
    }
  };

  const handlePreviewTemplate = (template: PromptTemplate) => {
    setPreviewTemplateId(template.id);
    setPreviewOpen(true);
  };

  const handleReset = () => {
    if (resetToDefaults()) {
      message.success('已重置为默认模板');
    } else {
      message.error('重置失败，已恢复为重置前的内容');
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
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              setEditingTemplateId(null);
              setEditorOpen(true);
            }}>
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
                    onEdit={handleEditTemplate}
                    onDelete={handleDeleteTemplate}
                    onToggleFavorite={handleToggleFavorite}
                    onPreview={handlePreviewTemplate}
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
        onClose={() => setEditorOpen(false)}
        afterClose={() => setEditingTemplateId(null)}
        onSave={handleSaveTemplate}
      />

      <TemplatePreviewModal
        open={previewOpen}
        template={previewTemplate}
        onClose={() => setPreviewOpen(false)}
        afterClose={() => setPreviewTemplateId(null)}
        onUse={handleUseTemplate}
        onEdit={handleEditTemplate}
        onToggleFavorite={handleToggleFavorite}
      />
    </>
  );
}
