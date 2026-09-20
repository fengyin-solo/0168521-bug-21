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
  addTemplate: (params: CreatePromptTemplateParams) => string | null;
  updateTemplate: (id: string, params: UpdatePromptTemplateParams) => boolean;
  deleteTemplate: (id: string) => boolean;
  toggleFavorite: (id: string) => boolean;
  setSelectedCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  setShowFavoritesOnly: (show: boolean) => void;
  resetToDefaults: () => boolean;
  getFilteredTemplates: () => PromptTemplate[];
  getCategories: () => string[];
}

type PromptTemplateStore = PromptTemplateState & PromptTemplateActions;

const persistTemplates = (templates: PromptTemplate[]) => {
  savePromptTemplates(templates);
};

const commitTemplates = (
  nextTemplates: PromptTemplate[],
  previousTemplates: PromptTemplate[],
  set: (partial: Partial<PromptTemplateState>) => void,
) => {
  try {
    persistTemplates(nextTemplates);
    set({ templates: nextTemplates });
    return true;
  } catch (error) {
    console.error('Failed to save prompt templates:', error);
    set({ templates: previousTemplates });
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

    const previousTemplates = get().templates;
    const nextTemplates = [newTemplate, ...previousTemplates];
    const saved = commitTemplates(nextTemplates, previousTemplates, set);

    return saved ? id : null;
  },

  updateTemplate: (id, params) => {
    const previousTemplates = get().templates;
    const templateExists = previousTemplates.some((t) => t.id === id);

    if (!templateExists) {
      return false;
    }

    const nextTemplates = previousTemplates.map((t) => {
      if (t.id !== id) return t;
      return {
        ...t,
        ...params,
        updatedAt: Date.now(),
      };
    });

    return commitTemplates(nextTemplates, previousTemplates, set);
  },

  deleteTemplate: (id) => {
    const previousTemplates = get().templates;
    const nextTemplates = previousTemplates.filter((t) => t.id !== id);

    if (nextTemplates.length === previousTemplates.length) {
      return false;
    }

    return commitTemplates(nextTemplates, previousTemplates, set);
  },

  toggleFavorite: (id) => {
    const previousTemplates = get().templates;
    const templateExists = previousTemplates.some((t) => t.id === id);

    if (!templateExists) {
      return false;
    }

    const nextTemplates = previousTemplates.map((t) => {
      if (t.id !== id) return t;
      return {
        ...t,
        isFavorite: !t.isFavorite,
        updatedAt: Date.now(),
      };
    });

    return commitTemplates(nextTemplates, previousTemplates, set);
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
    const previousState = get();

    try {
      const templates = resetPromptTemplates();
      set({
        templates,
        selectedCategory: null,
        searchQuery: '',
        showFavoritesOnly: false,
      });
      return true;
    } catch (error) {
      console.error('Failed to reset prompt templates:', error);
      set({
        templates: previousState.templates,
        selectedCategory: previousState.selectedCategory,
        searchQuery: previousState.searchQuery,
        showFavoritesOnly: previousState.showFavoritesOnly,
      });
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
