import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/storage', () => ({
  loadPromptTemplates: vi.fn(),
  savePromptTemplates: vi.fn(),
  resetPromptTemplates: vi.fn(),
}));

import { usePromptTemplateStore } from '../../src/stores';
import type { PromptTemplate } from '../../src/types';
import {
  loadPromptTemplates,
  savePromptTemplates,
} from '../../src/services/storage';

const mockedLoadPromptTemplates = vi.mocked(loadPromptTemplates);
const mockedSavePromptTemplates = vi.mocked(savePromptTemplates);

vi.spyOn(console, 'error').mockImplementation(() => {});

const makeTemplate = (overrides: Partial<PromptTemplate> = {}): PromptTemplate => ({
  id: 'template-1',
  name: '原模板',
  content: '原内容',
  category: '通用',
  description: '原描述',
  isFavorite: false,
  createdAt: 1000,
  updatedAt: 1000,
  ...overrides,
});

const resetStore = (templates: PromptTemplate[] = [makeTemplate()]) => {
  usePromptTemplateStore.setState({
    templates,
    selectedCategory: null,
    searchQuery: '',
    showFavoritesOnly: false,
    initialized: true,
  });
};

describe('promptTemplateStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  it('updates the shared template after a successful save', () => {
    const succeeded = usePromptTemplateStore.getState().updateTemplate('template-1', {
      name: '新模板',
      content: '新内容',
      category: '编程',
    });

    const template = usePromptTemplateStore.getState().templates[0];

    expect(succeeded).toBe(true);
    expect(mockedSavePromptTemplates).toHaveBeenCalledOnce();
    expect(template).toMatchObject({
      id: 'template-1',
      name: '新模板',
      content: '新内容',
      category: '编程',
    });
  });

  it('restores the previous template when persistence fails', () => {
    mockedSavePromptTemplates.mockImplementationOnce(() => {
      throw new Error('quota exceeded');
    });

    const succeeded = usePromptTemplateStore.getState().updateTemplate('template-1', {
      name: '失败的名称',
      content: '失败的内容',
      category: '写作',
    });

    const template = usePromptTemplateStore.getState().templates[0];

    expect(succeeded).toBe(false);
    expect(template).toEqual(makeTemplate());
  });

  it('restores the previous favorite state when persistence fails', () => {
    mockedSavePromptTemplates.mockImplementationOnce(() => {
      throw new Error('quota exceeded');
    });

    const succeeded = usePromptTemplateStore.getState().toggleFavorite('template-1');
    const template = usePromptTemplateStore.getState().templates[0];

    expect(succeeded).toBe(false);
    expect(template?.isFavorite).toBe(false);
  });

  it('loads templates from storage during initialization', () => {
    const loadedTemplate = makeTemplate({ id: 'loaded-1' });
    mockedLoadPromptTemplates.mockReturnValueOnce([loadedTemplate]);
    usePromptTemplateStore.setState({ initialized: false, templates: [] });

    usePromptTemplateStore.getState().initTemplates();

    expect(usePromptTemplateStore.getState().templates).toEqual([loadedTemplate]);
    expect(usePromptTemplateStore.getState().initialized).toBe(true);
  });
});
