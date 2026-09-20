import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  PromptTemplate,
  CreatePromptTemplateParams,
  UpdatePromptTemplateParams,
} from '../types';
import {
  loadPromptTemplates,
  savePromptTemplates,
  resetPromptTemplates,
} from '../services/storage';

interface PromptTemplateState {
  templates: PromptTemplate[];
  selectedCategory: string | null;
  searchQuery: string;
  showFavoritesOnly: boolean;
  initialized: boolean;
}

interface PromptTemplateActions {
  initTemplates: () => void;
  /** 返回新模板 id；持久化失败时返回 null，内存数据不变 */
  addTemplate: (params: CreatePromptTemplateParams) => string | null;
  /** 持久化成功返回 true；失败时保留改动前的模板并返回 false */
  updateTemplate: (id: string, params: UpdatePromptTemplateParams) => boolean;
  /** 持久化成功返回 true；失败时保留删除前的模板并返回 false */
  deleteTemplate: (id: string) => boolean;
  /** 持久化成功返回 true；失败时恢复原来的收藏状态并返回 false */
  toggleFavorite: (id: string) => boolean;
  setSelectedCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  setShowFavoritesOnly: (show: boolean) => void;
  resetToDefaults: () => boolean;
  getFilteredTemplates: () => PromptTemplate[];
  getCategories: () => string[];
}

type PromptTemplateStore = PromptTemplateState & PromptTemplateActions;

/**
 * 先落盘、落盘成功后才更新内存。
 * 这样存储失败时调用方仍持有上一份数据，编辑器也不会被清空。
 */
const persistTemplates = (templates: PromptTemplate[]): boolean => {
  try {
    savePromptTemplates(templates);
    return true;
  } catch (error) {
    console.error('Failed to save prompt templates:', error);
    return false;
  }
};

export const usePromptTemplateStore = create<PromptTemplateStore>((set, get) => ({
  templates: [],
  selectedCategory: null,
  searchQuery: '',
  showFavoritesOnly: false,
  initialized: false,

  initTemplates: () => {
    const templates = loadPromptTemplates();
    set({ templates, initialized: true });
  },

  addTemplate: (params) => {
    const id = uuidv4();
    const now = Date.now();

    const newTemplate: PromptTemplate = {
      id,
      name: params.name,
      content: params.content,
      category: params.category,
      description: params.description,
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    };

    const templates = [newTemplate, ...get().templates];
    if (!persistTemplates(templates)) {
      return null;
    }

    set({ templates });
    return id;
  },

  updateTemplate: (id, params) => {
    const previousTemplates = get().templates;
    const templates = previousTemplates.map((t) => {
      if (t.id !== id) return t;
      return {
        ...t,
        ...params,
        updatedAt: Date.now(),
      };
    });

    if (!persistTemplates(templates)) {
      // 落盘失败：内存保持上一份，调用方可据此保持弹窗打开并提示
      return false;
    }

    set({ templates });
    return true;
  },

  deleteTemplate: (id) => {
    const templates = get().templates.filter((t) => t.id !== id);
    if (!persistTemplates(templates)) {
      return false;
    }
    set({ templates });
    return true;
  },

  toggleFavorite: (id) => {
    const previousTemplates = get().templates;
    const templates = previousTemplates.map((t) => {
      if (t.id !== id) return t;
      return {
        ...t,
        isFavorite: !t.isFavorite,
        updatedAt: Date.now(),
      };
    });

    if (!persistTemplates(templates)) {
      return false;
    }
    set({ templates });
    return true;
  },

  setSelectedCategory: (category) => {
    set({ selectedCategory: category });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  setShowFavoritesOnly: (show) => {
    set({ showFavoritesOnly: show });
  },

  resetToDefaults: () => {
    try {
      const templates = resetPromptTemplates();
      set({ templates, selectedCategory: null, searchQuery: '', showFavoritesOnly: false });
      return true;
    } catch (error) {
      console.error('Failed to reset prompt templates:', error);
      return false;
    }
  },

  getFilteredTemplates: () => {
    const { templates, selectedCategory, searchQuery, showFavoritesOnly } = get();

    return templates.filter((t) => {
      if (selectedCategory && t.category !== selectedCategory) {
        return false;
      }

      if (showFavoritesOnly && !t.isFavorite) {
        return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          t.name.toLowerCase().includes(query) ||
          (t.description?.toLowerCase().includes(query)) ||
          t.content.toLowerCase().includes(query) ||
          t.category.toLowerCase().includes(query)
        );
      }

      return true;
    });
  },

  getCategories: () => {
    const { templates } = get();
    const categories = new Set<string>();
    templates.forEach((t) => categories.add(t.category));
    return Array.from(categories).sort();
  },
}));
