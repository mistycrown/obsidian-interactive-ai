'use strict';

const { Plugin, ItemView, PluginSettingTab, Setting, Notice, MarkdownView, Menu, MarkdownRenderer, setIcon } = require('obsidian');

const DEFAULT_SETTINGS = {
    // 讯飞星火设置
    sparkConfig: {
        enabled: true,
        apiKey: '',
        apiSecret: '',
        appId: '',
        domain: 'generalv3.5'
    },
    // DeepSeek设置
    deepseekConfig: {
        enabled: false,
        apiKey: '',
        baseUrl: 'https://api.deepseek.com'
    },
    // OpenAI设置
    openaiConfig: {
        enabled: false,
        apiKey: '',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4-turbo-preview',
        organization: ''  // 可选的组织ID
    },
    // 豆包设置
    doubaoConfig: {
        enabled: false,
        accessKey: '',  // VOLC_ACCESSKEY
        secretKey: '',  // VOLC_SECRETKEY
        baseUrl: 'https://ark-cn-beijing.bytedance.net/api/v3',
        model: '',  // endpoint ID
        endpointId: '',  // endpoint ID
        region: 'cn-beijing'  // 指定区域
    },
    // Moonshot设置
    moonshotConfig: {
        enabled: false,
        apiKey: '',
        baseUrl: 'https://api.moonshot.cn/v1',
        model: 'moonshot-v1-8k'
    },
    // 智谱GLM设置
    glmConfig: {
        enabled: false,
        apiKey: '',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        model: 'glm-4-plus'
    },
    // 通义千问设置
    qwenConfig: {
        enabled: false,
        apiKey: '',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        model: 'qwen-turbo'
    },
    // Gemini设置
    geminiConfig: {
        enabled: false,
        apiKey: '',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        model: 'gemini-1.5-flash'
    },
    // 当前选择的模型
    currentModel: 'spark',
    // 问答格式设置
    qaFormat: {
        calloutType: 'note'  // 默认使用note类型
    },
    // 上下文设置
    contextSettings: {
        enabled: false,
        type: 'current' // 'full' | 'surrounding' | 'current'
    },
    // 提示词设置
    promptGroups: [
        {
            id: 'default',
            name: '常用工具',
            order: 0,
            expanded: true,
            icon: 'zap' // 闪电图标，表示快速工具
        },
        {
            id: 'writing',
            name: '写作助手',
            order: 1,
            expanded: true,
            icon: 'pencil' // 铅笔图标，表示写作
        },
        {
            id: 'translation',
            name: '翻译工具',
            order: 2,
            expanded: true,
            icon: 'globe-2' // 地球图标，表示语言
        },
        {
            id: 'analysis',
            name: '分析工具',
            order: 3,
            expanded: true,
            icon: 'glasses' // 眼镜图标，表示分析研究
        },
        {
            id: 'programming',
            name: '编程助手',
            order: 4,
            expanded: true,
            icon: 'code-2' // 代码图标，更现代的样式
        }
    ],
    prompts: [
        {
            id: '1',
            name: '总结',
            prompt: '请总结以下内容：\n{{text}}',
            groupId: 'default',
            order: 0
        },
        {
            id: '2',
            name: '翻译成英文',
            prompt: '请将以下内容翻译成英文：\n{{text}}',
            groupId: 'default',
            order: 1
        }
    ]
}

// 侧边栏视图类
class InteractiveAIView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.plugin = plugin;
        this.cards = [];
    }

    getViewType() {
        return 'interactive-ai-view';
    }

    getDisplayText() {
        return 'Interactive AI';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.classList.add('interactive-ai-container');

        // 创建导航栏
        const navBar = container.createDiv('interactive-ai-nav');
        
        // 模型选择器
        const modelSelector = navBar.createEl('select', {
            cls: 'interactive-ai-model-select'
        });

        // 添加已启用的模型选项
        const configs = {
            'spark': { name: '讯飞星火', config: this.plugin.settings.sparkConfig },
            'deepseek': { name: 'DeepSeek', config: this.plugin.settings.deepseekConfig },
            'moonshot': { name: 'Moonshot', config: this.plugin.settings.moonshotConfig },
            'glm': { name: '智谱GLM', config: this.plugin.settings.glmConfig },
            'qwen': { name: '通义千问', config: this.plugin.settings.qwenConfig },
            'doubao': { name: '豆包', config: this.plugin.settings.doubaoConfig },
            'gemini': { name: 'Google Gemini', config: this.plugin.settings.geminiConfig },
            'openai': { name: 'OpenAI', config: this.plugin.settings.openaiConfig }
        };

        Object.entries(configs).forEach(([key, value]) => {
            if (value.config.enabled) {
                const option = modelSelector.createEl('option', {
                    text: value.name,
                    value: key
                });
                if (key === this.plugin.settings.currentModel) {
                    option.selected = true;
                }
            }
        });

        modelSelector.addEventListener('change', async (e) => {
            this.plugin.settings.currentModel = e.target.value;
            await this.plugin.saveSettings();
        });

        // 添加上下文控制组
        const contextControl = navBar.createDiv('interactive-ai-context-control');

        // 添加复选框和图标容器
        const contextWrapper = contextControl.createDiv('interactive-ai-context-wrapper');
        contextWrapper.setAttribute('aria-label', '使用笔记上下文');

        const contextCheckbox = contextWrapper.createEl('input', {
            type: 'checkbox',
            cls: 'interactive-ai-context-checkbox'
        });
        contextCheckbox.checked = this.plugin.settings.contextSettings.enabled;

        // 创建图标
        const contextIcon = contextWrapper.createEl('span', {
            cls: 'interactive-ai-context-icon'
        });
        setIcon(contextIcon, 'book-open');

        // 添加上下文范围选择器
        const contextSelector = contextControl.createEl('select', {
            cls: 'interactive-ai-context-select'
        });
        contextSelector.style.display = this.plugin.settings.contextSettings.enabled ? 'inline-block' : 'none';

        // 添加选项
        const contextOptions = [
            { value: 'full', text: '全文' },
            { value: 'surrounding', text: '前后段落' },
            { value: 'current', text: '当前段落' }
        ];
        contextOptions.forEach(option => {
            const optionEl = contextSelector.createEl('option', {
                text: option.text,
                value: option.value
            });
            if (option.value === this.plugin.settings.contextSettings.type) {
                optionEl.selected = true;
            }
        });

        // 复选框变化时显示/隐藏选择器
        contextCheckbox.addEventListener('change', async (e) => {
            contextSelector.style.display = contextCheckbox.checked ? 'inline-block' : 'none';
            this.plugin.settings.contextSettings.enabled = contextCheckbox.checked;
            await this.plugin.saveSettings();
        });

        // 选择器变化时保存设置
        contextSelector.addEventListener('change', async (e) => {
            this.plugin.settings.contextSettings.type = e.target.value;
            await this.plugin.saveSettings();
        });

        // 创建对话内容区域
        this.contentArea = container.createDiv('interactive-ai-content');

        // 创建输入区域容器
        const inputContainer = container.createDiv('interactive-ai-input-container');

        // 创建引用区域
        const referenceArea = inputContainer.createDiv('interactive-ai-reference');
        referenceArea.style.display = 'none'; // 默认隐藏

        // 引用图标
        const referenceIcon = referenceArea.createDiv('interactive-ai-reference-icon');
        const quoteIcon = this.createSvgIcon('quote');
        referenceIcon.appendChild(quoteIcon);

        // 引用文本
        const referenceText = referenceArea.createDiv('interactive-ai-reference-text');

        // 清除引用按钮
        const clearButton = referenceArea.createDiv('interactive-ai-reference-clear');
        const closeIcon = this.createSvgIcon('x');
        clearButton.appendChild(closeIcon);
        clearButton.addEventListener('click', () => {
            referenceArea.style.display = 'none';
            referenceText.setText('');
            delete inputContainer.dataset.reference;
        });

        // 创建输入框包装器
        const inputWrapper = inputContainer.createDiv('interactive-ai-input-wrapper');

        // 创建输入框
        const textarea = inputWrapper.createEl('textarea', {
            cls: 'interactive-ai-input',
            attr: {
                placeholder: '输入问题，按Enter发送（Shift+Enter换行）'
            }
        });

        // 添加发送按钮
        const sendButton = inputWrapper.createEl('button', {
            cls: 'interactive-ai-send-button',
            text: '发送'
        });

        // 处理发送逻辑
        const handleSend = async () => {
            const text = textarea.value.trim();
            if (text) {
                let finalText = text;
                let sourceInfo = null;
                let contextContent = '';

                // 获取当前活动的编辑器视图
                const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                console.log('发送时当前活动视图:', view ? view.file.path : 'null');
                
                // 如果有引用文本，将其添加到问题中
                if (inputContainer.dataset.reference) {
                    finalText = `参考以下内容：\n${inputContainer.dataset.reference}\n\n${text}`;
                    sourceInfo = this.sourceInfo;
                    
                    // 如果启用了上下文，获取引用文本周围的上下文
                    if (this.plugin.settings.contextSettings.enabled && view) {
                        contextContent = this.getContextContent(view.editor);
                    }
                } else if (view) {
                    // 如果是直接在输入框输入，记录当前文件和光标位置
                    const editor = view.editor;
                    const cursor = editor.getCursor();
                    sourceInfo = {
                        filePath: view.file.path,
                        from: cursor,
                        to: cursor
                    };
                    
                    // 如果启用了上下文，获取当前位置的上下文
                    if (this.plugin.settings.contextSettings.enabled) {
                        contextContent = this.getContextContent(editor);
                    }
                } else {
                    // 如果没有引用文本也没有活动编辑器，使用最近一次对话作为上下文
                    if (this.cards && this.cards.length > 0) {
                        const lastCard = this.cards[0]; // 获取最新的对话卡片
                        const lastQuestion = lastCard.originalQuestion;
                        const lastAnswer = lastCard.querySelector('.interactive-ai-answer div').getAttribute('data-original-text');
                        contextContent = `上一次对话：\n问：${lastQuestion}\n答：${lastAnswer}`;
                        new Notice('使用最近一次对话作为上下文');
                    }
                }

                // 构建最终的提示词
                if (contextContent) {
                    finalText = `参考以下上下文：\n\n${contextContent}\n\n问题：${text}`;
                }
                
                const card = this.createCard(text, '', sourceInfo);
                await this.plugin.callAPI(finalText, (content) => {
                    if (card) {
                        this.updateCardContent(card, content);
                    }
                });
                textarea.value = '';
                // 清除引用
                referenceArea.style.display = 'none';
                referenceText.setText('');
                delete inputContainer.dataset.reference;
                this.sourceInfo = null; // 清除源信息
            }
        };

        // 发送按钮点击事件
        sendButton.addEventListener('click', handleSend);

        // 处理输入框的按键事件
        textarea.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                await handleSend();
            }
        });
    }

    // 创建SVG图标的辅助方法
    createSvgIcon(type) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('width', '16');
        svg.setAttribute('height', '16');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('stroke-linecap', 'round');
        svg.setAttribute('stroke-linejoin', 'round');

        switch (type) {
            case 'quote':
                const quotePath1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                quotePath1.setAttribute('d', 'M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z');
                svg.appendChild(quotePath1);
                
                const quotePath2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                quotePath2.setAttribute('d', 'M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z');
                svg.appendChild(quotePath2);
                break;
                
            case 'x':
                const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                
                line1.setAttribute('x1', '18');
                line1.setAttribute('y1', '6');
                line1.setAttribute('x2', '6');
                line1.setAttribute('y2', '18');
                svg.appendChild(line1);

                line2.setAttribute('x1', '6');
                line2.setAttribute('y1', '6');
                line2.setAttribute('x2', '18');
                line2.setAttribute('y2', '18');
                svg.appendChild(line2);
                break;

            case 'book-open':
                const bookPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                bookPath.setAttribute('d', 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z');
                svg.appendChild(bookPath);
                
                const bookPath2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                bookPath2.setAttribute('d', 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z');
                svg.appendChild(bookPath2);
                break;
        }
        return svg;
    }

    // 设置引用文本的方法
    setReference(text) {
        console.log('设置引用文本:', text);
        
        const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        console.log('当前活动视图:', view ? view.file.path : 'null');
        
        if (view) {
            const editor = view.editor;
            const from = editor.getCursor('from');
            const to = editor.getCursor('to');
            // 保存源信息到实例变量
            this.sourceInfo = {
                filePath: view.file.path,
                from: from,
                to: to,
                selectedText: text
            };
            console.log('保存引用源信息:', this.sourceInfo);
        } else {
            console.log('未找到活动的编辑器视图');
        }

        const inputContainer = this.containerEl.querySelector('.interactive-ai-input-container');
        const referenceArea = inputContainer.querySelector('.interactive-ai-reference');
        const referenceText = referenceArea.querySelector('.interactive-ai-reference-text');
        
        referenceArea.style.display = 'flex';
        const displayText = text.length > 100 ? text.slice(0, 100) + '...' : text;
        console.log('显示引用文本:', displayText);
        
        referenceText.setText(displayText);
        inputContainer.dataset.reference = text;
    }

    // 更新卡片内容
    updateCardContent(cardEl, content) {
        const answerEl = cardEl.querySelector('.interactive-ai-answer div');
        if (answerEl) {
            // 保存原始文本
            answerEl.setAttribute('data-original-text', content);
            // 清空现有内容
            answerEl.empty();
            // 渲染Markdown
            MarkdownRenderer.renderMarkdown(content, answerEl, '', this.plugin);
        }
    }

    // 创建新的卡片
    createCard(question, answer, sourceInfo) {
        const cardEl = this.contentArea.createDiv('interactive-ai-card');
        
        // 保存源信息和原始问题
        cardEl.sourceInfo = sourceInfo;
        cardEl.originalQuestion = question;

        // 创建卡片头部
        const headerEl = cardEl.createDiv('interactive-ai-card-header');
        
        // 左侧时间戳和问题
        const headerLeft = headerEl.createDiv('interactive-ai-header-left');
        
        // 时间戳
        const timestamp = headerLeft.createDiv('interactive-ai-timestamp');
        const now = new Date();
        timestamp.setText(now.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }));

        // 问题部分
        const questionEl = headerLeft.createDiv('interactive-ai-question');
        const questionContent = questionEl.createDiv('interactive-ai-question-content');
        const shortQuestion = question.length > 10 ? question.slice(0, 10) + '...' : question;
        questionContent.setText(shortQuestion);
        questionContent.setAttribute('data-original-text', question);

        // 关闭按钮
        const closeButton = headerEl.createDiv('interactive-ai-close');
        closeButton.setText('×');
        closeButton.addEventListener('click', () => {
            cardEl.remove();
            const index = this.cards.indexOf(cardEl);
            if (index > -1) {
                this.cards.splice(index, 1);
            }
        });

        // 回答部分
        const answerEl = cardEl.createDiv('interactive-ai-answer');
        const answerContent = answerEl.createDiv({
            cls: 'markdown-rendered',
            attr: {
                style: 'user-select: text; cursor: text;'
            }
        });
        
        // 渲染初始回答
        if (answer) {
            answerContent.setAttribute('data-original-text', answer);
            MarkdownRenderer.renderMarkdown(answer, answerContent, '', this.plugin);
        } else {
            answerContent.setText('正在思考...');
        }

        // 按钮容器
        const buttonsEl = cardEl.createDiv('interactive-ai-buttons');

        // 重试按钮
        const retryButton = this.createButton(buttonsEl, '重试', async () => {
            // 清空现有回答
            answerContent.empty();
            answerContent.setText('正在思考...');
            
            // 重新发送请求
            await this.plugin.callAPI(cardEl.originalQuestion, (content) => {
                this.updateCardContent(cardEl, content);
            });
        }, '重新生成回答');

        // 复制按钮
        const copyButton = this.createButton(buttonsEl, '复制', async () => {
            const originalText = answerContent.getAttribute('data-original-text');
            if (originalText) {
                await navigator.clipboard.writeText(originalText);
                new Notice('已复制到剪贴板');
            }
        }, '复制回答到剪贴板');

        // 复制问答按钮
        const copyQAButton = this.createButton(buttonsEl, '复制问答', async () => {
            const originalText = answerContent.getAttribute('data-original-text');
            if (originalText) {
                // 处理回答文本（每一行添加 > 前缀）
                const formattedAnswer = originalText
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                    .map(line => `> ${line}`)
                    .join('\n');

                // 使用固定的问答格式模板
                const format = `> [!${this.plugin.settings.qaFormat.calloutType}] ${cardEl.originalQuestion}\n${formattedAnswer}`;
                
                await navigator.clipboard.writeText(format);
                new Notice('已复制问答格式到剪贴板');
            }
        }, '以问答格式复制到剪贴板');

        // 只有在有源信息时才显示替换按钮
        if (sourceInfo && sourceInfo.selectedText) {
            // 替换按钮
            const replaceButton = this.createButton(buttonsEl, '替换', async () => {
                console.log('点击替换按钮');
                console.log('卡片源信息:', cardEl.sourceInfo);
                
                // 获取活动编辑器
                let view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                
                // 如果没有找到活动视图，尝试激活源文件
                if (!view && cardEl.sourceInfo) {
                    const sourceFile = this.plugin.app.vault.getAbstractFileByPath(cardEl.sourceInfo.filePath);
                    if (sourceFile) {
                        await this.plugin.app.workspace.getLeaf().openFile(sourceFile);
                        // 重新获取视图
                        view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                    }
                }

                console.log('当前活动视图:', view ? view.file.path : 'null');
                
                if (view) {
                    const editor = view.editor;
                    const originalText = answerContent.getAttribute('data-original-text');
                    console.log('原始回答文本:', originalText);
                    
                    if (originalText) {
                        if (cardEl.sourceInfo) {
                            console.log('使用源文件信息进行替换');
                            console.log('源文件路径:', cardEl.sourceInfo.filePath);
                            console.log('选中范围:', cardEl.sourceInfo.from, cardEl.sourceInfo.to);
                            
                            if (view.file.path === cardEl.sourceInfo.filePath) {
                                console.log('在原位置进行替换');
                                editor.setSelection(cardEl.sourceInfo.from, cardEl.sourceInfo.to);
                            } else {
                                console.log('文件不匹配，在当前位置替换');
                            }
                        } else {
                            console.log('没有源文件信息，在当前位置替换');
                        }
                        
                        editor.replaceSelection(originalText);
                        new Notice('已替换选中文本');
                    } else {
                        console.log('未找到原始回答文本');
                    }
                } else {
                    console.log('未找到活动的编辑器视图');
                    new Notice('请先打开一个笔记文件');
                }
            }, '替换选中的文本');

            // 插入按钮
            const appendButton = this.createButton(buttonsEl, '插入', async () => {
                console.log('点击插入按钮');
                console.log('卡片源信息:', cardEl.sourceInfo);
                
                // 获取活动编辑器
                let view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                console.log('当前活动视图:', view ? view.file.path : 'null');
                
                // 如果没有找到活动视图，尝试激活源文件
                if (!view && cardEl.sourceInfo) {
                    const sourceFile = this.plugin.app.vault.getAbstractFileByPath(cardEl.sourceInfo.filePath);
                    if (sourceFile) {
                        await this.plugin.app.workspace.getLeaf().openFile(sourceFile);
                        // 重新获取视图
                        view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                    }
                }

                console.log('当前活动视图:', view ? view.file.path : 'null');
                
                if (view) {
                    const editor = view.editor;
                    const originalText = answerContent.getAttribute('data-original-text');
                    console.log('原始回答文本:', originalText);
                    
                    if (originalText) {
                        if (cardEl.sourceInfo) {
                            console.log('使用源文件信息进行插入');
                            console.log('源文件路径:', cardEl.sourceInfo.filePath);
                            console.log('插入位置:', cardEl.sourceInfo.to);
                            
                            if (view.file.path === cardEl.sourceInfo.filePath) {
                                console.log('在原文件位置后插入');
                                editor.setCursor(cardEl.sourceInfo.to);
                            }
                        }
                        
                        const cursor = editor.getCursor();
                        editor.replaceRange('\n' + originalText, cursor);
                        new Notice('已插入内容');
                    } else {
                        console.log('未找到原始回答文本');
                    }
                } else {
                    console.log('未找到活动的编辑器视图');
                    new Notice('请先打开一个笔记文件');
                }
            }, '在原文后追加');

            // 问答按钮
            const qaButton = this.createButton(buttonsEl, '问答', async () => {
                console.log('点击问答按钮');
                console.log('卡片源信息:', cardEl.sourceInfo);
                console.log('原始问题:', cardEl.originalQuestion);
                
                // 获取活动编辑器
                let view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                
                // 如果没有找到活动视图，尝试激活源文件
                if (!view && cardEl.sourceInfo) {
                    const sourceFile = this.plugin.app.vault.getAbstractFileByPath(cardEl.sourceInfo.filePath);
                    if (sourceFile) {
                        await this.plugin.app.workspace.getLeaf().openFile(sourceFile);
                        // 重新获取视图
                        view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                    }
                }

                console.log('当前活动视图:', view ? view.file.path : 'null');
                
                if (view) {
                    const editor = view.editor;
                    const originalText = answerContent.getAttribute('data-original-text');
                    console.log('原始回答文本:', originalText);
                    
                    if (originalText) {
                        // 处理问题文本（作为标题）
                        const formattedQuestion = cardEl.originalQuestion;
                        
                        // 处理回答文本（每一行添加 > 前缀）
                        const formattedAnswer = originalText
                            .split('\n')
                            .map(line => line.trim())
                            .filter(line => line.length > 0)
                            .map(line => `> ${line}`)
                            .join('\n');

                        // 使用固定的问答格式模板
                        const format = `> [!${this.plugin.settings.qaFormat.calloutType}] ${formattedQuestion}\n${formattedAnswer}`;
                        
                        // 如果有源信息，使用源信息的位置进行替换
                        if (cardEl.sourceInfo && cardEl.sourceInfo.from && cardEl.sourceInfo.to) {
                            console.log('使用源文件信息进行替换');
                            console.log('源文件路径:', cardEl.sourceInfo.filePath);
                            console.log('替换范围:', cardEl.sourceInfo.from, cardEl.sourceInfo.to);
                            
                            if (view.file.path === cardEl.sourceInfo.filePath) {
                                console.log('在原位置进行替换');
                                editor.setSelection(cardEl.sourceInfo.from, cardEl.sourceInfo.to);
                                editor.replaceSelection(format);
                                new Notice('已替换为问答格式');
                            } else {
                                console.log('文件不匹配，在当前位置替换');
                                editor.replaceSelection(format);
                                new Notice('已替换为问答格式');
                            }
                        } else {
                            console.log('没有源文件信息，在当前位置替换');
                            editor.replaceSelection(format);
                            new Notice('已替换为问答格式');
                        }
                    } else {
                        console.log('未找到原始回答文本');
                        new Notice('未找到回答内容');
                    }
                } else {
                    console.log('未找到活动的编辑器视图');
                    new Notice('请先打开一个笔记文件');
                }
            }, '以问答格式替换选中文本');
        }

        // 将新卡片插入到内容区域的最前面
        if (this.contentArea.firstChild) {
            this.contentArea.insertBefore(cardEl, this.contentArea.firstChild);
        } else {
            this.contentArea.appendChild(cardEl);
        }

        this.cards = this.cards || [];
        this.cards.push(cardEl);
        return cardEl;
    }

    // 创建按钮
    createButton(container, text, callback, tooltip) {
        const button = container.createEl('button', {
            cls: 'interactive-ai-button',
            attr: {
                'aria-label': tooltip || text  
            }
        });

        // 创建图标
        const iconSpan = button.createEl('span');
        switch (text) {
            case '重试':
                setIcon(iconSpan, 'refresh-cw');
                break;
            case '替换':
                setIcon(iconSpan, 'pencil');
                break;
            case '复制':
                setIcon(iconSpan, 'clipboard');
                break;
            case '复制问答':
                setIcon(iconSpan, 'message-square-quote');
                break;
            case '插入':
                setIcon(iconSpan, 'plus-circle');
                break;
            case '问答':
                setIcon(iconSpan, 'message-circle');
                break;
        }

        button.addEventListener('click', callback);
        return button;
    }

    // 辅助函数：将HTML转换为Markdown
    htmlToMarkdown(html) {
        // 移除所有的 class 属性
        html = html.replace(/\sclass="[^"]*"/g, '');
        
        // 处理代码块
        html = html.replace(/<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g, (match, attrs, content) => {
            // 移除HTML实体编码
            content = content
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#x27;/g, "'")
                .replace(/&#x2F;/g, '/')
                .replace(/&nbsp;/g, ' ');
            return '```\n' + content + '\n```';
        });

        // 处理其他Markdown元素
        return html
            // 段落
            .replace(/<p[^>]*>([\s\S]*?)<\/p>/g, '$1\n\n')
            // 标题
            .replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1\n')
            .replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1\n')
            .replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1\n')
            .replace(/<h4[^>]*>(.*?)<\/h4>/g, '#### $1\n')
            .replace(/<h5[^>]*>(.*?)<\/h5>/g, '##### $1\n')
            .replace(/<h6[^>]*>(.*?)<\/h6>/g, '###### $1\n')
            // 列表
            .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/g, '$1\n')
            .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/g, '$1\n')
            .replace(/<li[^>]*>([\s\S]*?)<\/li>/g, '- $1\n')
            // 引用
            .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/g, '> $1\n')
            // 强调
            .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/g, '**$1**')
            .replace(/<b[^>]*>([\s\S]*?)<\/b>/g, '**$1**')
            .replace(/<em[^>]*>([\s\S]*?)<\/em>/g, '*$1*')
            .replace(/<i[^>]*>([\s\S]*?)<\/i>/g, '*$1*')
            // 行内代码
            .replace(/<code[^>]*>([\s\S]*?)<\/code>/g, '`$1`')
            // 链接
            .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, '[$2]($1)')
            // 图片
            .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/g, '![$2]($1)')
            // 分隔线
            .replace(/<hr[^>]*>/g, '---\n')
            // 换行
            .replace(/<br[^>]*>/g, '\n')
            // 移除剩余的HTML标签
            .replace(/<[^>]+>/g, '')
            // 处理HTML实体
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&#x2F;/g, '/')
            .replace(/&nbsp;/g, ' ')
            // 清理多余的空行
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .trim();
    }

    getIcon() {
        return "bot";
    }

    // 获取当前段落
    getCurrentParagraph(editor) {
        const currentLine = editor.getCursor().line;
        let start = currentLine;
        let end = currentLine;

        // 向上查找段落起始
        while (start > 0 && editor.getLine(start - 1).trim() !== '') {
            start--;
        }

        // 向下查找段落结束
        while (end < editor.lineCount() - 1 && editor.getLine(end + 1).trim() !== '') {
            end++;
        }

        return editor.getRange(
            { line: start, ch: 0 },
            { line: end, ch: editor.getLine(end).length }
        );
    }

    // 获取前一段落
    getParagraphBefore(editor, currentLine) {
        let line = currentLine - 1;
        let paragraphEnd = line;
        
        // 跳过空行
        while (line >= 0 && editor.getLine(line).trim() === '') {
            line--;
        }
        paragraphEnd = line;

        // 找到段落开始
        while (line >= 0 && editor.getLine(line).trim() !== '') {
            line--;
        }

        if (paragraphEnd < 0) return '';

        return editor.getRange(
            { line: line + 1, ch: 0 },
            { line: paragraphEnd, ch: editor.getLine(paragraphEnd).length }
        );
    }

    // 获取后一段落
    getParagraphAfter(editor, currentLine) {
        let line = currentLine + 1;
        let paragraphStart = line;
        
        // 跳过空行
        while (line < editor.lineCount() && editor.getLine(line).trim() === '') {
            line++;
        }
        paragraphStart = line;

        // 找到段落结束
        while (line < editor.lineCount() && editor.getLine(line).trim() !== '') {
            line++;
        }

        if (paragraphStart >= editor.lineCount()) return '';

        return editor.getRange(
            { line: paragraphStart, ch: 0 },
            { line: line - 1, ch: editor.getLine(line - 1).length }
        );
    }

    // 获取上下文内容
    getContextContent(editor) {
        if (!this.plugin.settings.contextSettings.enabled) {
            return '';
        }

        const contextType = this.plugin.settings.contextSettings.type;
        switch (contextType) {
            case 'full':
                return editor.getValue();
            case 'surrounding':
                const currentLine = editor.getCursor().line;
                const prevPara = this.getParagraphBefore(editor, currentLine);
                const currentPara = this.getCurrentParagraph(editor);
                const nextPara = this.getParagraphAfter(editor, currentLine);
                return [prevPara, currentPara, nextPara].filter(p => p).join('\n\n');
            case 'current':
                return this.getCurrentParagraph(editor);
            default:
                return '';
        }
    }
}

class InteractiveAIPlugin extends Plugin {
    async onload() {
        await this.loadSettings();

        // 注册视图
        this.registerView(
            'interactive-ai-view',
            (leaf) => (this.view = new InteractiveAIView(leaf, this))
        );

        // 添加插件设置选项卡
        this.addSettingTab(new InteractiveAISettingTab(this.app, this));

        // 添加命令 - 打开AI助手侧边栏
        this.addCommand({
            id: 'open-interactive-ai',
            name: '打开AI助手侧边栏',
            callback: () => {
                this.activateView();
            }
        });

        // 添加命令 - 处理选中文本
        this.addCommand({
            id: 'process-selected-text',
            name: '发送选中文本到AI',
            editorCallback: (editor) => {
                const selectedText = editor.getSelection();
                if (selectedText) {
                    this.processSelectedText(selectedText);
                } else {
                    new Notice('请先选择文本');
                }
            },
            hotkeys: [{ modifiers: ["Mod", "Alt"], key: "i" }]
        });

        // 添加命令 - 引用选中文本
        this.addCommand({
            id: 'quote-to-interactive-ai',
            name: '引用至Interactive AI',
            editorCallback: (editor) => {
                const selectedText = editor.getSelection();
                if (selectedText) {
                    this.activateView().then(() => {
                        if (this.view) {
                            this.view.setReference(selectedText);
                        }
                    });
                } else {
                    new Notice('请先选择文本');
                }
            }
        });

        // 注册编辑器菜单事件
        this.registerEvent(
            this.app.workspace.on("editor-menu", (menu, editor) => {
                const selectedText = editor.getSelection();
                if (selectedText) {
                    // 添加主菜单项并创建子菜单
                    menu.addItem((item) => {
                        item.setTitle("Interactive AI")
                            .setIcon("bot")
                            .setSubmenu();  // 创建子菜单

                        const submenu = item.submenu;

                        // 添加默认选项到子菜单
                        submenu.addItem((item) => {
                            item.setTitle("直接发送")
                                .setIcon("arrow-right")
                                .onClick(async () => {
                                    await this.activateView();
                                    await this.handlePromptSelection(selectedText, selectedText);
                                });
                        });

                        // 添加引用选项到子菜单
                        submenu.addItem((item) => {
                            item.setTitle("引用至Interactive AI")
                                .setIcon("quote-glyph")
                                .onClick(async () => {
                                    await this.activateView();
                                    if (this.view) {
                                        this.view.setReference(selectedText);
                                    }
                                });
                        });

                        // 获取排序后的分组
                        const sortedGroups = [...this.settings.promptGroups].sort((a, b) => a.order - b.order);

                        // 遍历每个分组
                        sortedGroups.forEach(group => {
                            // 添加分隔线到子菜单
                            submenu.addSeparator();

                            // 获取该分组的提示词
                            const groupPrompts = this.settings.prompts
                                .filter(p => p.groupId === group.id)
                                .sort((a, b) => a.order - b.order);

                            // 添加分组标题到子菜单
                            submenu.addItem((item) => {
                                item.setTitle(group.name)
                                    .setIcon(group.icon || 'list')
                                    .setDisabled(true);
                            });

                            // 添加该分组的提示词到子菜单
                            groupPrompts.forEach(prompt => {
                                submenu.addItem((item) => {
                                    item.setTitle(prompt.name)
                                        .onClick(async () => {
                                            await this.activateView();
                                            const processedPrompt = prompt.prompt.replace('{{text}}', selectedText);
                                            await this.handlePromptSelection(selectedText, processedPrompt);
                                        });
                                });
                            });
                        });
                    });
                }
            })
        );

        // 自动打开侧边栏
        this.app.workspace.onLayoutReady(() => {
            this.activateView();
        });
    }

    async handlePromptSelection(originalText, promptText) {
        console.log('处理提示词选择');
        console.log('原始文本:', originalText);
        console.log('处理后的提示词:', promptText);
        
        // 保存当前编辑器的状态
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        console.log('当前活动视图:', view ? view.file.path : 'null');
        
        let sourceInfo = null;
        let contextContent = '';
        
        if (view) {
            const editor = view.editor;
            const from = editor.getCursor('from');
            const to = editor.getCursor('to');
            sourceInfo = {
                filePath: view.file.path,
                from: from,
                to: to,
                selectedText: originalText
            };
            console.log('创建源文件信息:', sourceInfo);

            // 获取上下文内容
            if (this.settings.contextSettings.enabled) {
                contextContent = this.view.getContextContent(editor);
                console.log('获取上下文内容:', contextContent ? '成功' : '无');
            }
        } else {
            console.log('未找到活动的编辑器视图');
        }

        // 构建最终的提示词
        let finalPrompt = promptText;
        if (contextContent) {
            finalPrompt = `参考以下文档内容：\n\n${contextContent}\n\n基于以上内容回答问题：\n${promptText}`;
        }

        // 创建卡片并发送请求
        console.log('创建新卡片，源信息:', sourceInfo);
        const card = this.view.createCard(originalText, '', sourceInfo);
        await this.callAPI(finalPrompt, (content) => {
            if (card) {
                console.log('更新卡片内容');
                this.view.updateCardContent(card, content);
            }
        });
    }

    async processSelectedText(text) {
        console.log('开始处理选中文本:', text);

        if (!this.settings.apiSecret) {
            console.error('API密钥未配置');
            new Notice('请先在设置中配置API密钥');
            return;
        }

        try {
            await this.handlePromptSelection(text, text);
        } catch (error) {
            console.error('API调用失败:', error);
            new Notice('调用API失败: ' + error.message);
        }
    }

    async activateView() {
        const workspace = this.app.workspace;
        if (workspace.getLeavesOfType('interactive-ai-view').length === 0) {
            await workspace.getRightLeaf(false).setViewState({
                type: 'interactive-ai-view',
                active: true,
            });
        }
    }

    async onunload() {
        this.app.workspace.detachLeavesOfType('interactive-ai-view');
    }

    // 替换选中的文本
    async replaceSelectedText(text) {
        const editor = this.getActiveEditor();
        if (editor && editor.somethingSelected()) {
            editor.replaceSelection(text);
        }
    }

    // 在选中文本后追加
    async appendToSelectedText(text) {
        const editor = this.getActiveEditor();
        if (editor && editor.somethingSelected()) {
            const selection = editor.getSelection();
            const cursor = editor.getCursor('to');
            editor.replaceSelection(selection + '\n' + text);
        }
    }

    // 插入问答格式
    async insertAsQA(question, answer) {
        const editor = this.getActiveEditor();
        if (editor && editor.somethingSelected()) {
            const qaFormat = `> [!question] 问题\n> ${question}\n\n> [!answer] 回答\n> ${answer}`;
            editor.replaceSelection(qaFormat);
        }
    }

    // 获取当前活动编辑器
    getActiveEditor() {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) {
            // 如果没有找到活动视图，尝试获取最后一个打开的markdown视图
            const markdownLeaves = this.app.workspace.getLeavesOfType('markdown');
            if (markdownLeaves.length > 0) {
                const lastMarkdownView = markdownLeaves[markdownLeaves.length - 1].view;
                if (lastMarkdownView instanceof MarkdownView) {
                    return lastMarkdownView.editor;
                }
            }
        }
        return view ? view.editor : null;
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async callAPI(text, onUpdate) {
        const model = this.settings.currentModel;
        
        if (model === 'spark' && this.settings.sparkConfig.enabled) {
            return this.callSparkAPI(text, onUpdate);
        } else if (model === 'deepseek' && this.settings.deepseekConfig.enabled) {
            return this.callDeepSeekAPI(text, onUpdate);
        } else if (model === 'moonshot' && this.settings.moonshotConfig.enabled) {
            return this.callMoonshotAPI(text, onUpdate);
        } else if (model === 'glm' && this.settings.glmConfig.enabled) {
            return this.callGLMAPI(text, onUpdate);
        } else if (model === 'qwen' && this.settings.qwenConfig.enabled) {
            return this.callQwenAPI(text, onUpdate);
        } else if (model === 'doubao' && this.settings.doubaoConfig.enabled) {
            return this.callDoubaoAPI(text, onUpdate);
        } else if (model === 'gemini' && this.settings.geminiConfig.enabled) {
            return this.callGeminiAPI(text, onUpdate);
        } else if (model === 'openai' && this.settings.openaiConfig.enabled) {
            return this.callOpenAIApi(text, onUpdate);
        } else {
            throw new Error('请先在设置中选择并配置要使用的模型');
        }
    }

    async callDeepSeekAPI(text, onUpdate) {
        if (!this.settings.deepseekConfig.apiKey) {
            throw new Error('请先配置DeepSeek API Key');
        }

        const url = `${this.settings.deepseekConfig.baseUrl}/chat/completions`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.settings.deepseekConfig.apiKey}`
        };

        const data = {
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant.'
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            stream: true
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let content = '';

            while (true) {
                const {value, done} = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.includes('[DONE]')) continue;

                    try {
                        const jsonStr = line.replace(/^data: /, '');
                        const response = JSON.parse(jsonStr);
                        
                        if (response.choices && response.choices[0].delta.content) {
                            content += response.choices[0].delta.content;
                            if (onUpdate) {
                                onUpdate(content);
                            }
                        }
                    } catch (e) {
                        console.error('解析响应失败:', e);
                    }
                }
            }

            return {
                choices: [
                    {
                        message: {
                            content: content
                        }
                    }
                ]
            };
        } catch (error) {
            console.error('DeepSeek API调用失败:', error);
            throw error;
        }
    }

    async callMoonshotAPI(text, onUpdate) {
        if (!this.settings.moonshotConfig.apiKey) {
            throw new Error('请先配置Moonshot API Key');
        }

        const url = `${this.settings.moonshotConfig.baseUrl}/chat/completions`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.settings.moonshotConfig.apiKey}`
        };

        const data = {
            model: this.settings.moonshotConfig.model,
            messages: [
                {
                    role: 'system',
                    content: '你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。'
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            temperature: 0.3,
            stream: true
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let content = '';

            while (true) {
                const {value, done} = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.includes('[DONE]')) continue;

                    try {
                        const jsonStr = line.replace(/^data: /, '');
                        const response = JSON.parse(jsonStr);
                        
                        if (response.choices && response.choices[0].delta.content) {
                            content += response.choices[0].delta.content;
                            if (onUpdate) {
                                onUpdate(content);
                            }
                        }
                    } catch (e) {
                        console.error('解析响应失败:', e);
                    }
                }
            }

            return {
                choices: [
                    {
                        message: {
                            content: content
                        }
                    }
                ]
            };
        } catch (error) {
            console.error('Moonshot API调用失败:', error);
            throw error;
        }
    }

    async callSparkAPI(text, onUpdate) {
        if (!this.settings.sparkConfig.apiKey || !this.settings.sparkConfig.apiSecret || !this.settings.sparkConfig.appId) {
            throw new Error('请先完成讯飞星火API配置（API Key、API Secret和App ID）');
        }

        // 检查API Secret是否为空或格式不正确
        if (!this.settings.sparkConfig.apiSecret || this.settings.sparkConfig.apiSecret.trim() === '') {
            throw new Error('API Secret不能为空');
        }

        // 根据模型版本获取对应的WebSocket URL和domain
        const getModelConfig = () => {
            const version = this.settings.sparkConfig.domain;
            switch (version) {
                case '4.0Ultra':
                    return {
                        url: 'wss://spark-api.xf-yun.com/v4.0/chat',
                        domain: '4.0Ultra'
                    };
                case 'max-32k':
                    return {
                        url: 'wss://spark-api.xf-yun.com/chat/max-32k',
                        domain: 'max-32k'
                    };
                case 'generalv3.5':
                    return {
                        url: 'wss://spark-api.xf-yun.com/v3.5/chat',
                        domain: 'generalv3.5'
                    };
                case 'pro-128k':
                    return {
                        url: 'wss://spark-api.xf-yun.com/chat/pro-128k',
                        domain: 'pro-128k'
                    };
                case 'generalv3':
                    return {
                        url: 'wss://spark-api.xf-yun.com/v3.1/chat',
                        domain: 'generalv3'
                    };
                case 'lite':
                    return {
                        url: 'wss://spark-api.xf-yun.com/v1.1/chat',
                        domain: 'lite'
                    };
                default:
                    throw new Error('未知的模型版本');
            }
        };

        const modelConfig = getModelConfig();

        return new Promise((resolve, reject) => {
            try {
                // 生成鉴权URL
                const host = 'spark-api.xf-yun.com';
                const date = new Date().toUTCString();
                const path = modelConfig.url.replace('wss://spark-api.xf-yun.com', '');

                // 生成签名字符串
                const tmp = [
                    `host: ${host}`,
                    `date: ${date}`,
                    `GET ${path} HTTP/1.1`
                ].join('\n');

                // 使用HMAC-SHA256算法结合APISecret对tmp签名
                const encoder = new TextEncoder();
                const apiSecret = this.settings.sparkConfig.apiSecret.trim();
                
                if (!apiSecret) {
                    throw new Error('API Secret解码失败');
                }

                const keyData = encoder.encode(apiSecret);
                const dataData = encoder.encode(tmp);

                crypto.subtle.importKey(
                    'raw',
                    keyData,
                    { name: 'HMAC', hash: 'SHA-256' },
                    false,
                    ['sign']
                ).then(cryptoKey => {
                    return crypto.subtle.sign(
                        'HMAC',
                        cryptoKey,
                        dataData
                    );
                }).then(signature => {
                    const signatureBase64 = btoa(String.fromCharCode.apply(null, new Uint8Array(signature)));

                    // 组装authorization_origin
                    const authorization_origin = `api_key="${this.settings.sparkConfig.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureBase64}"`;
                    
                    // 生成最终的authorization
                    const authorization = btoa(authorization_origin);

                    // 构建WebSocket URL
                    const params = new URLSearchParams({
                        authorization: authorization,
                        date: date,
                        host: host
                    });

                    const wsUrl = `${modelConfig.url}?${params.toString()}`;
                    const ws = new WebSocket(wsUrl);
                    let responseText = '';

                    ws.onopen = () => {
                        console.log('WebSocket连接已建立，准备发送数据...');
                        const data = {
                            header: {
                                app_id: this.settings.sparkConfig.appId,
                                uid: "default"
                            },
                            parameter: {
                                chat: {
                                    domain: modelConfig.domain,
                                    temperature: 0.5,
                                    max_tokens: 4096
                                }
                            },
                            payload: {
                                message: {
                                    text: [
                                        {
                                            role: "user",
                                            content: text
                                        }
                                    ]
                                }
                            }
                        };

                        console.log('发送数据:', JSON.stringify(data, null, 2));
                        ws.send(JSON.stringify(data));
                    };

                    ws.onmessage = (event) => {
                        console.log('收到消息:', event.data);
                        try {
                            // 检查是否是[DONE]消息
                            if (event.data === 'data:[DONE]') {
                                console.log('收到结束标记，关闭连接');
                                ws.close();
                                resolve({
                                    choices: [
                                        {
                                            message: {
                                                content: responseText
                                            }
                                        }
                                    ]
                                });
                                return;
                            }

                            // 解析data:前缀
                            const jsonStr = event.data.replace(/^data: /, '');
                            const response = JSON.parse(jsonStr);
                            console.log('解析后的响应:', response);

                            // 检查是否有错误
                            if (response.header && response.header.code !== 0) {
                                console.error('API返回错误:', response.header);
                                ws.close();
                                reject(new Error(response.header.message || '未知错误'));
                                return;
                            }

                            // 累积响应文本
                            if (response.payload && response.payload.choices && response.payload.choices.text) {
                                const content = response.payload.choices.text[0].content;
                                console.log('收到内容:', content);
                                responseText += content;
                                // 调用更新回调
                                if (onUpdate) {
                                    onUpdate(responseText);
                                }
                            }
                        } catch (error) {
                            console.error('解析响应失败:', error, '原始数据:', event.data);
                        }
                    };

                    ws.onerror = (error) => {
                        console.error('WebSocket错误:', error);
                        reject(new Error('WebSocket连接错误'));
                    };

                    ws.onclose = (event) => {
                        console.log('WebSocket连接已关闭', event.code, event.reason);
                        if (!responseText) {
                            reject(new Error('连接关闭但未收到响应'));
                        }
                    };

                    // 设置超时
                    setTimeout(() => {
                        if (ws.readyState === WebSocket.OPEN) {
                            console.log('连接超时，强制关闭');
                            ws.close();
                            reject(new Error('连接超时'));
                        }
                    }, 30000); // 30秒超时
                }).catch(error => {
                    console.error('处理过程中出错:', error);
                    reject(error);
                });
            } catch (error) {
                console.error('处理过程中出错:', error);
                reject(error);
            }
        });
    }

    async callGLMAPI(text, onUpdate) {
        if (!this.settings.glmConfig.apiKey) {
            throw new Error('请先配置智谱GLM API Key');
        }

        const url = `${this.settings.glmConfig.baseUrl}/chat/completions`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.settings.glmConfig.apiKey}`
        };

        const data = {
            model: this.settings.glmConfig.model,
            messages: [
                {
                    role: 'system',
                    content: '你是一个乐于回答各种问题的小助手，你的任务是提供专业、准确、有洞察力的建议。'
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            temperature: 0.3,
            stream: true
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let content = '';

            while (true) {
                const {value, done} = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.includes('[DONE]')) continue;

                    try {
                        const jsonStr = line.replace(/^data: /, '');
                        const response = JSON.parse(jsonStr);
                        
                        if (response.choices && response.choices[0].delta && response.choices[0].delta.content) {
                            content += response.choices[0].delta.content;
                            if (onUpdate) {
                                onUpdate(content);
                            }
                        }
                    } catch (e) {
                        console.error('解析响应失败:', e);
                    }
                }
            }

            return {
                choices: [
                    {
                        message: {
                            content: content
                        }
                    }
                ]
            };
        } catch (error) {
            console.error('智谱GLM API调用失败:', error);
            throw error;
        }
    }

    async callQwenAPI(text, onUpdate) {
        if (!this.settings.qwenConfig.apiKey) {
            throw new Error('请先配置通义千问 API Key');
        }

        const url = `${this.settings.qwenConfig.baseUrl}/chat/completions`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.settings.qwenConfig.apiKey}`
        };

        const data = {
            model: this.settings.qwenConfig.model,
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant.'
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            temperature: 0.3,
            stream: true,
            stream_options: {
                "include_usage": true
            }
        };

        try {
            console.log('发送请求到通义千问API:', url);
            console.log('请求头:', headers);
            console.log('请求数据:', data);

            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('通义千问API错误响应:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let content = '';

            while (true) {
                const {value, done} = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.includes('[DONE]')) continue;

                    try {
                        const jsonStr = line.replace(/^data: /, '');
                        const response = JSON.parse(jsonStr);
                        console.log('通义千问API返回数据:', response);
                        
                        if (response.choices && response.choices[0]) {
                            if (response.choices[0].delta && response.choices[0].delta.content) {
                                content += response.choices[0].delta.content;
                            } else if (response.choices[0].message && response.choices[0].message.content) {
                                content += response.choices[0].message.content;
                            }
                            
                            if (onUpdate) {
                                onUpdate(content);
                            }
                        }

                        // 如果有usage信息，记录到日志
                        if (response.usage) {
                            console.log('Token使用情况:', response.usage);
                        }
                    } catch (e) {
                        console.error('解析响应失败:', e, '原始数据:', line);
                    }
                }
            }

            return {
                choices: [
                    {
                        message: {
                            content: content
                        }
                    }
                ]
            };
        } catch (error) {
            console.error('通义千问API调用失败:', error);
            throw error;
        }
    }

    // 添加代理处理函数
    async handleProxyRequest(apiUrl, options) {
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400'
        };

        // 创建新的请求对象
        const request = new Request(apiUrl, {
            ...options,
            headers: {
                ...options.headers,
                'Origin': new URL(apiUrl).origin
            }
        });

        // 发送请求
        const response = await fetch(request);
        
        // 创建新的响应对象
        return new Response(response.body, {
            ...response,
            headers: {
                ...response.headers,
                ...corsHeaders
            }
        });
    }

    async callDoubaoAPI(text, onUpdate) {
        if (!this.settings.doubaoConfig.secretKey) {
            throw new Error('请先配置豆包 Secret Key');
        }

        const https = require('https');
        const fullUrl = `${this.settings.doubaoConfig.baseUrl}/chat/completions`;
        const url = new URL(fullUrl);
        
        const data = {
            model: this.settings.doubaoConfig.endpointId,
            messages: [
                {
                    role: 'system',
                    content: '你是豆包，是由字节跳动开发的 AI 人工智能助手'
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            temperature: 0.3,
            stream: true
        };

        // 确保region有值
        const region = this.settings.doubaoConfig.region || 'cn-beijing';

        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.settings.doubaoConfig.secretKey}`,
                'X-Region': region
            }
        };

        console.log('完整URL:', fullUrl);
        console.log('hostname:', options.hostname);
        console.log('path:', options.path);
        console.log('Region:', region);
        console.log('EndpointId:', this.settings.doubaoConfig.endpointId);

        return new Promise((resolve, reject) => {
            try {
                console.log('发送请求到豆包API:', url.toString());
                console.log('请求头:', options.headers);
                console.log('请求数据:', data);

                const req = https.request(options, (res) => {
                    if (res.statusCode !== 200) {
                        let errorData = '';
                        res.on('data', (chunk) => {
                            errorData += chunk;
                        });
                        res.on('end', () => {
                            console.error('豆包API错误响应:', {
                                statusCode: res.statusCode,
                                headers: res.headers,
                                body: errorData
                            });
                            reject(new Error(`HTTP error! status: ${res.statusCode}, body: ${errorData}`));
                        });
                        return;
                    }

                    let content = '';
                    res.setEncoding('utf8');

                    res.on('data', (chunk) => {
                        const lines = chunk.split('\n');
                        for (const line of lines) {
                            if (line.trim() === '') continue;
                            if (line.includes('[DONE]')) continue;

                            try {
                                const jsonStr = line.replace(/^data: /, '');
                                const response = JSON.parse(jsonStr);
                                console.log('豆包API返回数据:', response);
                                
                                if (response.choices && response.choices[0]) {
                                    if (response.choices[0].delta && response.choices[0].delta.content) {
                                        content += response.choices[0].delta.content;
                                    } else if (response.choices[0].message && response.choices[0].message.content) {
                                        content += response.choices[0].message.content;
                                    }
                                    
                                    if (onUpdate) {
                                        onUpdate(content);
                                    }
                                }

                                if (response.usage) {
                                    console.log('Token使用情况:', response.usage);
                                }
                            } catch (e) {
                                console.error('解析响应失败:', e, '原始数据:', line);
                            }
                        }
                    });

                    res.on('end', () => {
                        resolve({
                            choices: [
                                {
                                    message: {
                                        content: content
                                    }
                                }
                            ]
                        });
                    });
                });

                req.on('error', (error) => {
                    console.error('请求错误:', error);
                    reject(error);
                });

                req.write(JSON.stringify(data));
                req.end();
            } catch (error) {
                console.error('豆包API调用失败:', error);
                reject(error);
            }
        });
    }

    async callGeminiAPI(text, onUpdate) {
        if (!this.settings.geminiConfig.apiKey) {
            throw new Error('请先在设置中配置Gemini API Key');
        }

        const apiUrl = `${this.settings.geminiConfig.baseUrl}/models/${this.settings.geminiConfig.model}:generateContent?key=${this.settings.geminiConfig.apiKey}`;
        
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: text
                        }]
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Gemini API 调用失败: ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            const content = data.candidates[0]?.content?.parts[0]?.text || '';
            
            if (onUpdate) {
                onUpdate(content);
            }

            return content;
        } catch (error) {
            console.error('Gemini API调用错误:', error);
            throw error;
        }
    }

    async callOpenAIApi(text, onUpdate) {
        if (!this.settings.openaiConfig.apiKey) {
            throw new Error('请先配置OpenAI API Key');
        }

        const url = `${this.settings.openaiConfig.baseUrl}/chat/completions`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.settings.openaiConfig.apiKey}`
        };

        if (this.settings.openaiConfig.organization) {
            headers['OpenAI-Organization'] = this.settings.openaiConfig.organization;
        }

        const data = {
            model: this.settings.openaiConfig.model,
            messages: [
                {
                    role: 'system',
                    content: '你是一个有帮助的AI助手。'
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            temperature: 0.7,
            stream: true
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`OpenAI API调用失败: ${errorData.error?.message || response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let content = '';

            while (true) {
                const {value, done} = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.includes('[DONE]')) continue;

                    try {
                        const jsonStr = line.replace(/^data: /, '');
                        const response = JSON.parse(jsonStr);
                        
                        if (response.choices && response.choices[0].delta && response.choices[0].delta.content) {
                            content += response.choices[0].delta.content;
                            if (onUpdate) {
                                onUpdate(content);
                            }
                        }
                    } catch (e) {
                        console.error('解析响应失败:', e);
                    }
                }
            }

            return {
                choices: [
                    {
                        message: {
                            content: content
                        }
                    }
                ]
            };
        } catch (error) {
            console.error('OpenAI API调用错误:', error);
            throw error;
        }
    }
}

class InteractiveAISettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const {containerEl} = this;
        containerEl.empty();
        containerEl.createEl('h2', {text: 'Interactive AI 设置'});

        // 模型选择
        new Setting(containerEl)
            .setName('选择使用的模型')
            .setDesc('选择要使用的AI模型')
            .addDropdown(dropdown => dropdown
                .addOption('spark', '讯飞星火')
                .addOption('deepseek', 'DeepSeek')
                .addOption('moonshot', 'Moonshot')
                .addOption('glm', '智谱GLM')
                .addOption('qwen', '通义千问')
                .addOption('doubao', '豆包')
                .addOption('gemini', 'Google Gemini')
                .addOption('openai', 'OpenAI')
                .setValue(this.plugin.settings.currentModel)
                .onChange(async (value) => {
                    this.plugin.settings.currentModel = value;
                    await this.plugin.saveSettings();
                    // 刷新设置页面以显示/隐藏相应的设置项
                    this.display();
                }));

        // 讯飞星火设置
        if (this.plugin.settings.currentModel === 'spark') {
            containerEl.createEl('h3', {text: '讯飞星火设置'});
            
            new Setting(containerEl)
                .setName('启用讯飞星火')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.sparkConfig.enabled)
                    .onChange(async (value) => {
                        this.plugin.settings.sparkConfig.enabled = value;
                        await this.plugin.saveSettings();
                        this.display();
                    }));

            if (this.plugin.settings.sparkConfig.enabled) {
                new Setting(containerEl)
                    .setName('App ID')
                    .setDesc('请输入您的讯飞星火 App ID')
                    .addText(text => text
                        .setPlaceholder('输入App ID')
                        .setValue(this.plugin.settings.sparkConfig.appId)
                        .onChange(async (value) => {
                            this.plugin.settings.sparkConfig.appId = value;
                            await this.plugin.saveSettings();
                        }));

                new Setting(containerEl)
                    .setName('API Key')
                    .setDesc('请输入您的讯飞星火 API Key')
                    .addText(text => text
                        .setPlaceholder('输入API Key')
                        .setValue(this.plugin.settings.sparkConfig.apiKey)
                        .onChange(async (value) => {
                            this.plugin.settings.sparkConfig.apiKey = value;
                            await this.plugin.saveSettings();
                        }));

                new Setting(containerEl)
                    .setName('API Secret')
                    .setDesc('请输入您的讯飞星火 API Secret')
                    .addText(text => text
                        .setPlaceholder('输入API Secret')
                        .setValue(this.plugin.settings.sparkConfig.apiSecret)
                        .onChange(async (value) => {
                            this.plugin.settings.sparkConfig.apiSecret = value;
                            await this.plugin.saveSettings();
                        }));

                new Setting(containerEl)
                    .setName('模型版本')
                    .setDesc('选择讯飞星火模型版本')
                    .addDropdown(dropdown => dropdown
                        .addOption('4.0Ultra', 'Spark 4.0 Ultra')
                        .addOption('max-32k', 'Spark Max-32K')
                        .addOption('generalv3.5', 'Spark Max')
                        .addOption('pro-128k', 'Spark Pro-128K')
                        .addOption('generalv3', 'Spark Pro')
                        .addOption('lite', 'Spark Lite')
                        .setValue(this.plugin.settings.sparkConfig.domain)
                        .onChange(async (value) => {
                            this.plugin.settings.sparkConfig.domain = value;
                            await this.plugin.saveSettings();
                        }));
            }
        }

        // DeepSeek设置
        if (this.plugin.settings.currentModel === 'deepseek') {
            containerEl.createEl('h3', {text: 'DeepSeek设置'});
            
            new Setting(containerEl)
                .setName('启用DeepSeek')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.deepseekConfig.enabled)
                    .onChange(async (value) => {
                        this.plugin.settings.deepseekConfig.enabled = value;
                        await this.plugin.saveSettings();
                        this.display();
                    }));

            if (this.plugin.settings.deepseekConfig.enabled) {
                new Setting(containerEl)
                    .setName('API Key')
                    .setDesc('请输入您的DeepSeek API Key')
                    .addText(text => text
                        .setPlaceholder('输入API Key')
                        .setValue(this.plugin.settings.deepseekConfig.apiKey)
                        .onChange(async (value) => {
                            this.plugin.settings.deepseekConfig.apiKey = value;
                            await this.plugin.saveSettings();
                        }));

                new Setting(containerEl)
                    .setName('API Base URL')
                    .setDesc('DeepSeek API的基础URL')
                    .addText(text => text
                        .setPlaceholder('https://api.deepseek.com')
                        .setValue(this.plugin.settings.deepseekConfig.baseUrl)
                        .onChange(async (value) => {
                            this.plugin.settings.deepseekConfig.baseUrl = value;
                            await this.plugin.saveSettings();
                        }));
            }
        }

        // Moonshot设置
        if (this.plugin.settings.currentModel === 'moonshot') {
            containerEl.createEl('h3', {text: 'Moonshot设置'});
            
            new Setting(containerEl)
                .setName('启用Moonshot')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.moonshotConfig.enabled)
                    .onChange(async (value) => {
                        this.plugin.settings.moonshotConfig.enabled = value;
                        await this.plugin.saveSettings();
                        this.display();
                    }));

            if (this.plugin.settings.moonshotConfig.enabled) {
                new Setting(containerEl)
                    .setName('API Key')
                    .setDesc('请输入您的Moonshot API Key')
                    .addText(text => text
                        .setPlaceholder('输入API Key')
                        .setValue(this.plugin.settings.moonshotConfig.apiKey)
                        .onChange(async (value) => {
                            this.plugin.settings.moonshotConfig.apiKey = value;
                            await this.plugin.saveSettings();
                        }));

                new Setting(containerEl)
                    .setName('API Base URL')
                    .setDesc('Moonshot API的基础URL')
                    .addText(text => text
                        .setPlaceholder('https://api.moonshot.cn/v1')
                        .setValue(this.plugin.settings.moonshotConfig.baseUrl)
                        .onChange(async (value) => {
                            this.plugin.settings.moonshotConfig.baseUrl = value;
                            await this.plugin.saveSettings();
                        }));

                new Setting(containerEl)
                    .setName('模型版本')
                    .setDesc('选择Moonshot模型版本')
                    .addDropdown(dropdown => dropdown
                        .addOption('moonshot-v1-8k', 'Moonshot v1-8k')
                        .addOption('moonshot-v1-16k', 'Moonshot v1-16k')
                        .addOption('moonshot-v1-32k', 'Moonshot v1-32k')
                        .addOption('moonshot-v1-64k', 'Moonshot v1-64k')
                        .addOption('moonshot-v1-128k', 'Moonshot v1-128k')
                        .addOption('moonshot-v1-256k', 'Moonshot v1-256k')
                        .addOption('moonshot-v1-512k', 'Moonshot v1-512k')
                        .addOption('moonshot-v1-1024k', 'Moonshot v1-1024k')
                        .setValue(this.plugin.settings.moonshotConfig.model)
                        .onChange(async (value) => {
                            this.plugin.settings.moonshotConfig.model = value;
                            await this.plugin.saveSettings();
                        }));
            }
        }

        // 智谱GLM设置
        if (this.plugin.settings.currentModel === 'glm') {
            containerEl.createEl('h3', {text: '智谱GLM设置'});
            
            new Setting(containerEl)
                .setName('启用智谱GLM')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.glmConfig.enabled)
                    .onChange(async (value) => {
                        this.plugin.settings.glmConfig.enabled = value;
                        await this.plugin.saveSettings();
                        this.display();
                    }));

            if (this.plugin.settings.glmConfig.enabled) {
                new Setting(containerEl)
                    .setName('API Key')
                    .setDesc('请输入您的智谱GLM API Key')
                    .addText(text => text
                        .setPlaceholder('输入API Key')
                        .setValue(this.plugin.settings.glmConfig.apiKey)
                        .onChange(async (value) => {
                            this.plugin.settings.glmConfig.apiKey = value;
                            await this.plugin.saveSettings();
                        }));

                new Setting(containerEl)
                    .setName('API Base URL')
                    .setDesc('智谱GLM API的基础URL')
                    .addText(text => text
                        .setPlaceholder('https://open.bigmodel.cn/api/paas/v4')
                        .setValue(this.plugin.settings.glmConfig.baseUrl)
                        .onChange(async (value) => {
                            this.plugin.settings.glmConfig.baseUrl = value;
                            await this.plugin.saveSettings();
                        }));

                new Setting(containerEl)
                    .setName('模型版本')
                    .setDesc('选择智谱GLM模型版本')
                    .addDropdown(dropdown => dropdown
                        .addOption('glm-4-plus', 'GLM-4 Plus')
                        .addOption('glm-4-0520', 'GLM-4 0520')
                        .addOption('glm-4-air', 'GLM-4 Air')
                        .addOption('glm-4-airx', 'GLM-4 AirX')
                        .addOption('glm-4-long', 'GLM-4 Long')
                        .addOption('glm-4-flashx', 'GLM-4 FlashX')
                        .addOption('glm-4-flash', 'GLM-4 Flash')
                        .setValue(this.plugin.settings.glmConfig.model)
                        .onChange(async (value) => {
                            this.plugin.settings.glmConfig.model = value;
                            await this.plugin.saveSettings();
                        }));
            }
        }

        // 通义千问设置
        if (this.plugin.settings.currentModel === 'qwen') {
            containerEl.createEl('h3', {text: '通义千问设置'});
            
            new Setting(containerEl)
                .setName('启用通义千问')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.qwenConfig.enabled)
                    .onChange(async (value) => {
                        this.plugin.settings.qwenConfig.enabled = value;
                        await this.plugin.saveSettings();
                        this.display();
                    }));

            if (this.plugin.settings.qwenConfig.enabled) {
                new Setting(containerEl)
                    .setName('API Key')
                    .setDesc('请输入您的通义千问 API Key')
                    .addText(text => text
                        .setPlaceholder('输入API Key')
                        .setValue(this.plugin.settings.qwenConfig.apiKey)
                        .onChange(async (value) => {
                            this.plugin.settings.qwenConfig.apiKey = value;
                            await this.plugin.saveSettings();
                        }));

                new Setting(containerEl)
                    .setName('API Base URL')
                    .setDesc('通义千问 API的基础URL')
                    .addText(text => text
                        .setPlaceholder('https://dashscope.aliyuncs.com/compatible-mode/v1')
                        .setValue(this.plugin.settings.qwenConfig.baseUrl)
                        .onChange(async (value) => {
                            this.plugin.settings.qwenConfig.baseUrl = value;
                            await this.plugin.saveSettings();
                        }));

                new Setting(containerEl)
                    .setName('模型版本')
                    .setDesc('选择通义千问模型版本')
                    .addDropdown(dropdown => dropdown
                        .addOption('qwen-max', '通义千问-Max (最强推理能力)')
                        .addOption('qwen-plus', '通义千问-Plus (均衡)')
                        .addOption('qwen-turbo', '通义千问-Turbo (快速)')
                        .addOption('qwen-long', '通义千问-Long (长文本)')
                        .setValue(this.plugin.settings.qwenConfig.model)
                        .onChange(async (value) => {
                            this.plugin.settings.qwenConfig.model = value;
                            await this.plugin.saveSettings();
                        }));
            }
        }

        // 豆包设置
        if (this.plugin.settings.currentModel === 'doubao') {
            containerEl.createEl('h3', {text: '豆包设置'});
            
            new Setting(containerEl)
                .setName('启用豆包')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.doubaoConfig.enabled)
                    .onChange(async (value) => {
                        this.plugin.settings.doubaoConfig.enabled = value;
                        await this.plugin.saveSettings();
                        this.display();
                    }));

            if (this.plugin.settings.doubaoConfig.enabled) {
                new Setting(containerEl)
                    .setName('Access Key')
                    .setDesc('请输入您的VOLC_ACCESSKEY')
                    .addText(text => text
                        .setPlaceholder('输入Access Key')
                        .setValue(this.plugin.settings.doubaoConfig.accessKey)
                        .onChange(async (value) => {
                            this.plugin.settings.doubaoConfig.accessKey = value;
                            await this.plugin.saveSettings();
                        }));

                new Setting(containerEl)
                    .setName('Secret Key')
                    .setDesc('请输入您的VOLC_SECRETKEY')
                    .addText(text => text
                        .setPlaceholder('输入Secret Key')
                        .setValue(this.plugin.settings.doubaoConfig.secretKey)
                        .onChange(async (value) => {
                            this.plugin.settings.doubaoConfig.secretKey = value;
                            await this.plugin.saveSettings();
                        }));

                new Setting(containerEl)
                    .setName('API Base URL')
                    .setDesc('豆包 API的基础URL')
                    .addText(text => text
                        .setPlaceholder('https://ark-cn-beijing.bytedance.net/api/v3')
                        .setValue(this.plugin.settings.doubaoConfig.baseUrl)
                        .onChange(async (value) => {
                            this.plugin.settings.doubaoConfig.baseUrl = value;
                            await this.plugin.saveSettings();
                        }));

                new Setting(containerEl)
                    .setName('Endpoint ID')
                    .setDesc('请从火山方舟控制台获取您的推理端点ID')
                    .addText(text => text
                        .setPlaceholder('输入endpoint ID，例如：ep-20240826182225-kp7rp')
                        .setValue(this.plugin.settings.doubaoConfig.endpointId)
                        .onChange(async (value) => {
                            this.plugin.settings.doubaoConfig.endpointId = value;
                            this.plugin.settings.doubaoConfig.model = value;
                            await this.plugin.saveSettings();
                        }));

                new Setting(containerEl)
                    .setName('Region')
                    .setDesc('API区域')
                    .addText(text => text
                        .setPlaceholder('cn-beijing')
                        .setValue(this.plugin.settings.doubaoConfig.region)
                        .onChange(async (value) => {
                            this.plugin.settings.doubaoConfig.region = value;
                            await this.plugin.saveSettings();
                        }));
            }
        }

        // Google Gemini设置
        if (this.plugin.settings.currentModel === 'gemini') {
            containerEl.createEl('h3', {text: 'Google Gemini设置'});
            
            new Setting(containerEl)
                .setName('启用Google Gemini')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.geminiConfig.enabled)
                    .onChange(async (value) => {
                        this.plugin.settings.geminiConfig.enabled = value;
                        await this.plugin.saveSettings();
                        this.display();
                    }));

            if (this.plugin.settings.geminiConfig.enabled) {
                new Setting(containerEl)
                    .setName('API Key')
                    .setDesc('请输入您的Google Gemini API Key')
                    .addText(text => text
                        .setPlaceholder('输入API Key')
                        .setValue(this.plugin.settings.geminiConfig.apiKey)
                        .onChange(async (value) => {
                            this.plugin.settings.geminiConfig.apiKey = value;
                            await this.plugin.saveSettings();
                        }));

                new Setting(containerEl)
                    .setName('模型版本')
                    .setDesc('选择Google Gemini模型版本')
                    .addDropdown(dropdown => dropdown
                        .addOption('gemini-1.5-flash', 'Gemini 1.5 Flash')
                        .addOption('gemini-1.5-flash-8b', 'Gemini 1.5 Flash-8B')
                        .addOption('gemini-1.5-pro', 'Gemini 1.5 Pro')
                        .addOption('gemini-1.0-pro', 'Gemini 1.0 Pro')
                        .setValue(this.plugin.settings.geminiConfig.model)
                        .onChange(async (value) => {
                            this.plugin.settings.geminiConfig.model = value;
                            await this.plugin.saveSettings();
                        }));
            }
        }

        // OpenAI设置
        if (this.plugin.settings.currentModel === 'openai') {
            containerEl.createEl('h3', {text: 'OpenAI设置'});
            
            new Setting(containerEl)
                .setName('启用OpenAI')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.openaiConfig.enabled)
                    .onChange(async (value) => {
                        this.plugin.settings.openaiConfig.enabled = value;
                        await this.plugin.saveSettings();
                        this.display();
                    }));

            if (this.plugin.settings.openaiConfig.enabled) {
                new Setting(containerEl)
                    .setName('API Key')
                    .setDesc('请输入您的OpenAI API Key')
                    .addText(text => text
                        .setPlaceholder('输入API Key')
                        .setValue(this.plugin.settings.openaiConfig.apiKey)
                        .onChange(async (value) => {
                            this.plugin.settings.openaiConfig.apiKey = value;
                            await this.plugin.saveSettings();
                        }));

                new Setting(containerEl)
                    .setName('Organization ID')
                    .setDesc('可选：输入您的OpenAI组织ID')
                    .addText(text => text
                        .setPlaceholder('输入Organization ID（可选）')
                        .setValue(this.plugin.settings.openaiConfig.organization)
                        .onChange(async (value) => {
                            this.plugin.settings.openaiConfig.organization = value;
                            await this.plugin.saveSettings();
                        }));

                new Setting(containerEl)
                    .setName('API Base URL')
                    .setDesc('OpenAI API的基础URL，如果使用代理可以修改')
                    .addText(text => text
                        .setPlaceholder('https://api.openai.com/v1')
                        .setValue(this.plugin.settings.openaiConfig.baseUrl)
                        .onChange(async (value) => {
                            this.plugin.settings.openaiConfig.baseUrl = value;
                            await this.plugin.saveSettings();
                        }));

                new Setting(containerEl)
                    .setName('模型版本')
                    .setDesc('选择OpenAI模型版本')
                    .addDropdown(dropdown => dropdown
                        .addOption('gpt-4-turbo', 'GPT-4 Turbo')
                        .addOption('gpt-4', 'GPT-4')
                        .addOption('gpt-4-vision-preview', 'GPT-4 Vision')
                        .addOption('gpt-4o', 'GPT-4 Optimized')
                        .addOption('gpt-4o-latest', 'GPT-4 Optimized Latest')
                        .addOption('gpt-4o-mini', 'GPT-4 Optimized Mini')
                        .addOption('gpt-3.5-turbo', 'GPT-3.5 Turbo')
                        .addOption('gpt-3.5-turbo-16k', 'GPT-3.5 Turbo 16K')
                        .addOption('gpt-3.5-turbo-instruct', 'GPT-3.5 Turbo Instruct')
                        .setValue(this.plugin.settings.openaiConfig.model)
                        .onChange(async (value) => {
                            this.plugin.settings.openaiConfig.model = value;
                            await this.plugin.saveSettings();
                        }));
            }
        }

        // 提示词设置
        containerEl.createEl('h3', {text: '自定义提示词'});
        
        // 添加分组管理按钮
        new Setting(containerEl)
            .setName('分组管理')
            .addButton(button => button
                .setButtonText('+ 添加分组')
                .onClick(async () => {
                    const newGroupId = `group-${Date.now()}`;
                    this.plugin.settings.promptGroups.push({
                        id: newGroupId,
                        name: '新分组',
                        order: this.plugin.settings.promptGroups.length,
                        expanded: true
                    });
                    await this.plugin.saveSettings();
                    this.display();
                }));

        // 分组列表容器
        const groupsContainer = containerEl.createDiv('prompt-groups');
        
        // 按order排序分组
        const sortedGroups = [...this.plugin.settings.promptGroups].sort((a, b) => a.order - b.order);
        
        // 渲染每个分组
        sortedGroups.forEach((group, groupIndex) => {
            const groupDiv = groupsContainer.createDiv('prompt-group');
            
            // 分组标题栏
            const groupHeader = groupDiv.createDiv('prompt-group-header');
            
            // 分组展开/折叠图标
            const expandIcon = groupHeader.createDiv('prompt-group-expand-icon');
            expandIcon.innerHTML = group.expanded ? '▼' : '▶';
            expandIcon.addEventListener('click', async () => {
                group.expanded = !group.expanded;
                await this.plugin.saveSettings();
                this.display();
            });
            
            // 分组设置
            new Setting(groupHeader)
                .setName(group.name)
                .addText(text => text
                    .setValue(group.name)
                    .onChange(async (value) => {
                        group.name = value;
                        await this.plugin.saveSettings();
                    }))
                .addText(text => text
                    .setPlaceholder('输入Lucide图标名称')
                    .setValue(group.icon || '')
                    .onChange(async (value) => {
                        group.icon = value;
                        await this.plugin.saveSettings();
                    }))
                .addExtraButton(button => button
                    .setIcon('up-chevron-glyph')
                    .setTooltip('上移分组')
                    .onClick(async () => {
                        if (groupIndex > 0) {
                            const temp = group.order;
                            group.order = sortedGroups[groupIndex - 1].order;
                            sortedGroups[groupIndex - 1].order = temp;
                            await this.plugin.saveSettings();
                            this.display();
                        }
                    }))
                .addExtraButton(button => button
                    .setIcon('down-chevron-glyph')
                    .setTooltip('下移分组')
                    .onClick(async () => {
                        if (groupIndex < sortedGroups.length - 1) {
                            const temp = group.order;
                            group.order = sortedGroups[groupIndex + 1].order;
                            sortedGroups[groupIndex + 1].order = temp;
                            await this.plugin.saveSettings();
                            this.display();
                        }
                    }))
                .addExtraButton(button => button
                    .setIcon('trash')
                    .setTooltip('删除分组')
                    .onClick(async () => {
                        if (group.id === 'default') {
                            new Notice('默认分组不能删除');
                            return;
                        }
                        // 将该分组的提示词移动到默认分组
                        this.plugin.settings.prompts
                            .filter(p => p.groupId === group.id)
                            .forEach(p => p.groupId = 'default');
                        // 删除分组
                        this.plugin.settings.promptGroups = this.plugin.settings.promptGroups
                            .filter(g => g.id !== group.id);
                        await this.plugin.saveSettings();
                        this.display();
                    }));

            // 如果分组是展开的，显示该分组的提示词
            if (group.expanded) {
                const promptsDiv = groupDiv.createDiv('prompt-list');
                
                // 获取并排序该分组的提示词
                const groupPrompts = this.plugin.settings.prompts
                    .filter(p => p.groupId === group.id)
                    .sort((a, b) => a.order - b.order);
                
                // 渲染提示词
                groupPrompts.forEach((prompt, promptIndex) => {
                    const promptContainer = promptsDiv.createDiv('prompt-item');
                    
                    new Setting(promptContainer)
                        .setName('提示词名称')
                        .addText(text => text
                            .setValue(prompt.name)
                            .onChange(async (value) => {
                                prompt.name = value;
                                await this.plugin.saveSettings();
                            }))
                        .addExtraButton(button => button
                            .setIcon('up-chevron-glyph')
                            .setTooltip('上移')
                            .onClick(async () => {
                                if (promptIndex > 0) {
                                    const temp = prompt.order;
                                    prompt.order = groupPrompts[promptIndex - 1].order;
                                    groupPrompts[promptIndex - 1].order = temp;
                                    await this.plugin.saveSettings();
                                    this.display();
                                }
                            }))
                        .addExtraButton(button => button
                            .setIcon('down-chevron-glyph')
                            .setTooltip('下移')
                            .onClick(async () => {
                                if (promptIndex < groupPrompts.length - 1) {
                                    const temp = prompt.order;
                                    prompt.order = groupPrompts[promptIndex + 1].order;
                                    groupPrompts[promptIndex + 1].order = temp;
                                    await this.plugin.saveSettings();
                                    this.display();
                                }
                            }))
                        .addDropdown(dropdown => {
                            // 添加所有分组选项
                            this.plugin.settings.promptGroups.forEach(g => {
                                dropdown.addOption(g.id, g.name);
                            });
                            dropdown
                                .setValue(prompt.groupId)
                                .onChange(async (value) => {
                                    prompt.groupId = value;
                                    // 设置在新分组中的顺序
                                    const maxOrder = Math.max(...this.plugin.settings.prompts
                                        .filter(p => p.groupId === value)
                                        .map(p => p.order), -1);
                                    prompt.order = maxOrder + 1;
                                    await this.plugin.saveSettings();
                                    this.display();
                                });
                        });

                    new Setting(promptContainer)
                        .setName('提示词内容')
                        .setDesc('使用 {{text}} 表示选中的文字')
                        .addTextArea(text => text
                            .setValue(prompt.prompt)
                            .onChange(async (value) => {
                                prompt.prompt = value;
                                await this.plugin.saveSettings();
                            }));

                    // 删除按钮
                    new Setting(promptContainer)
                        .addButton(button => button
                            .setButtonText('删除')
                            .onClick(async () => {
                                this.plugin.settings.prompts = this.plugin.settings.prompts
                                    .filter(p => p.id !== prompt.id);
                                await this.plugin.saveSettings();
                                this.display();
                            }));
                });
            }
        });

        // 添加新提示词按钮
        new Setting(containerEl)
            .addButton(button => button
                .setButtonText('+ 添加提示词')
                .onClick(async () => {
                    const defaultGroup = this.plugin.settings.promptGroups.find(g => g.id === 'default');
                    const maxOrder = Math.max(...this.plugin.settings.prompts
                        .filter(p => p.groupId === 'default')
                        .map(p => p.order), -1);
                    
                    this.plugin.settings.prompts.push({
                        id: `prompt-${Date.now()}`,
                        name: '新提示词',
                        prompt: '{{text}}',
                        groupId: 'default',
                        order: maxOrder + 1
                    });
                    await this.plugin.saveSettings();
                    this.display();
                }));

        // Callout格式设置
        containerEl.createEl('h3', {text: 'Callout格式设置'});
        
        new Setting(containerEl)
            .setName('Callout类型')
            .setDesc('选择问答格式的Callout类型')
            .addDropdown(dropdown => dropdown
                .addOption('note', 'Note (默认)')
                .addOption('abstract', 'Abstract/Summary/TLDR')
                .addOption('info', 'Info/Todo')
                .addOption('tip', 'Tip/Hint/Important')
                .addOption('success', 'Success/Check/Done')
                .addOption('question', 'Question/Help/FAQ')
                .addOption('warning', 'Warning/Caution/Attention')
                .addOption('failure', 'Failure/Fail/Missing')
                .addOption('danger', 'Danger/Error')
                .addOption('bug', 'Bug')
                .addOption('example', 'Example')
                .addOption('quote', 'Quote/Cite')
                .setValue(this.plugin.settings.qaFormat.calloutType)
                .onChange(async (value) => {
                    this.plugin.settings.qaFormat.calloutType = value;
                    await this.plugin.saveSettings();
                }));
    }
}

module.exports = InteractiveAIPlugin; 