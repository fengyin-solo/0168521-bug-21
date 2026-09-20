import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { usePromptTemplateStore } from '../../src/stores/promptTemplateStore';
import { DEFAULT_TEMPLATES } from '../../src/types';

// ---- 最小 localStorage mock（storage.ts 只用到 getItem/setItem/removeItem） ----
function createLocalStorageMock() {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      for (const key of Object.keys(store)) delete store[key];
    },
    raw: store,
  };
}

let ls: ReturnType<typeof createLocalStorageMock>;

function setupStore() {
  ls = createLocalStorageMock();
  vi.stubGlobal('localStorage', ls);
  usePromptTemplateStore.setState({
    templates: [],
    selectedCategory: null,
    searchQuery: '',
    showFavoritesOnly: false,
    initialized: false,
  });
  usePromptTemplateStore.getState().initTemplates();
}

beforeEach(() => {
  setupStore();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('promptTemplateStore：单一来源', () => {
  it('初始化后保留全部默认模板的名称、内容与分类', () => {
    const { templates } = usePromptTemplateStore.getState();
    expect(templates).toHaveLength(DEFAULT_TEMPLATES.length);
    const sortedDefaults = [...DEFAULT_TEMPLATES].sort((a, b) => a.name.localeCompare(b.name));
    const sortedActual = [...templates].sort((a, b) => a.name.localeCompare(b.name));
    sortedActual.forEach((t, i) => {
      const expected = sortedDefaults[i]!;
      expect(t.name).toBe(expected.name);
      expect(t.content).toBe(expected.content);
      expect(t.category).toBe(expected.category);
    });
  });

  it('toggleFavorite 后按 id 从 store 取到的模板立即是新收藏状态（预览/卡片/编辑同源）', () => {
    const target = usePromptTemplateStore.getState().templates.find((t) => !t.isFavorite)!;
    const before = target.isFavorite;

    const ok = usePromptTemplateStore.getState().toggleFavorite(target.id);
    expect(ok).toBe(true);

    // 模拟三个入口都按 id 从同一份 store 数据派生
    const derived = usePromptTemplateStore
      .getState()
      .templates.find((t) => t.id === target.id)!;
    expect(derived.isFavorite).toBe(!before);

    // 已落盘
    expect(ls.setItem).toHaveBeenCalled();
    const persisted = JSON.parse(ls.raw['react-chat-prompt-templates']!) as Array<{
      id: string;
      isFavorite: boolean;
    }>;
    expect(persisted.find((t) => t.id === target.id)?.isFavorite).toBe(!before);
  });

  it('updateTemplate 后按 id 派生的内容、名称、分类立即同步', () => {
    const target = usePromptTemplateStore.getState().templates[0]!;
    const ok = usePromptTemplateStore.getState().updateTemplate(target.id, {
      name: '新名称',
      category: '写作',
      content: '全新的内容，必须与卡片截断处同源',
      description: '新描述',
    });
    expect(ok).toBe(true);

    const derived = usePromptTemplateStore.getState().templates.find((t) => t.id === target.id)!;
    expect(derived.name).toBe('新名称');
    expect(derived.category).toBe('写作');
    expect(derived.content).toBe('全新的内容，必须与卡片截断处同源');
    expect(derived.description).toBe('新描述');
  });
});

describe('promptTemplateStore：出错时找回上一份', () => {
  it('updateTemplate 落盘失败时返回 false 且内存保留改动前的数据', () => {
    const target = usePromptTemplateStore.getState().templates[0]!;
    const snapshot = { ...target };

    ls.setItem.mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    const ok = usePromptTemplateStore.getState().updateTemplate(target.id, {
      name: '不该生效的名称',
      content: '不该生效的内容',
    });

    expect(ok).toBe(false);
    const after = usePromptTemplateStore.getState().templates.find((t) => t.id === target.id)!;
    expect(after.name).toBe(snapshot.name);
    expect(after.content).toBe(snapshot.content);
    expect(after.category).toBe(snapshot.category);
  });

  it('toggleFavorite 落盘失败时返回 false 且收藏状态回滚', () => {
    const target = usePromptTemplateStore.getState().templates[0]!;
    const before = target.isFavorite;

    ls.setItem.mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    const ok = usePromptTemplateStore.getState().toggleFavorite(target.id);
    expect(ok).toBe(false);
    const after = usePromptTemplateStore.getState().templates.find((t) => t.id === target.id)!;
    expect(after.isFavorite).toBe(before);
  });

  it('deleteTemplate 落盘失败时返回 false 且模板仍在', () => {
    const { length } = usePromptTemplateStore.getState().templates;
    const targetId = usePromptTemplateStore.getState().templates[0]!.id;

    ls.setItem.mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    const ok = usePromptTemplateStore.getState().deleteTemplate(targetId);
    expect(ok).toBe(false);
    const { templates } = usePromptTemplateStore.getState();
    expect(templates).toHaveLength(length);
    expect(templates.some((t) => t.id === targetId)).toBe(true);
  });

  it('addTemplate 落盘失败时返回 null 且列表不变', () => {
    const { length } = usePromptTemplateStore.getState().templates;

    ls.setItem.mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    const id = usePromptTemplateStore.getState().addTemplate({
      name: '新模板',
      category: '通用',
      content: '内容',
    });
    expect(id).toBeNull();
    expect(usePromptTemplateStore.getState().templates).toHaveLength(length);
  });

  it('存储恢复后同一条模板可以正常保存成功', () => {
    const target = usePromptTemplateStore.getState().templates[0]!;

    ls.setItem.mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });
    expect(
      usePromptTemplateStore.getState().updateTemplate(target.id, { content: '临时失败' }),
    ).toBe(false);

    // 存储恢复（例如权限恢复/配额释放）后应能正常保存
    ls.setItem.mockImplementation((key: string, value: string) => {
      ls.raw[key] = value;
    });
    const ok = usePromptTemplateStore.getState().updateTemplate(target.id, {
      content: '恢复后保存',
    });
    expect(ok).toBe(true);
    const after = usePromptTemplateStore.getState().templates.find((t) => t.id === target.id)!;
    expect(after.content).toBe('恢复后保存');
  });
});
