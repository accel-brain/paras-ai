/**
 * フローティングキャプチャシステム
 * 画面右下に浮動するキャプチャボタンとメニューを提供
 */

class ParasAICaptureSystem {
    constructor() {
        this.isScrolling = false;
        this.scrollTimer = null;
        this.isMenuVisible = false;
        this.capturedImageData = null;
        
        // デフォルト設定
        this.settings = {
            scale: 2.0,
            format: 'png',
            quality: 0.9,
            backgroundColor: 'transparent'
        };
        
        this.init();
    }
    
    init() {
        this.createFloatingButton();
        this.createCaptureMenu();
        this.createQualityModal();
        this.setupScrollDetection();
        this.addStyles();
    }
    
    // CSSスタイルを動的に追加
    addStyles() {
        const style = document.createElement('style');
        style.id = 'paras_ai_capture_styles';
        style.textContent = `
/* PARAs AI フローティングキャプチャシステム - 青基調デザイン対応版 */

/* フローティングボタン */
.paras_ai_capture_floating_btn {
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 50%;
    color: white;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
    z-index: 10000;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.paras_ai_capture_floating_btn.paras_ai_capture_visible {
    opacity: 1;
    visibility: visible;
}

.paras_ai_capture_floating_btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 12px 35px rgba(102, 126, 234, 0.4);
    background: linear-gradient(135deg, #8a7ce8 0%, #8e6bb8 100%);
}

.paras_ai_capture_floating_btn:active {
    transform: translateY(-1px);
}

/* キャプチャメニュー */
.paras_ai_capture_menu {
    position: fixed;
    bottom: 100px;
    right: 30px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(15px);
    border-radius: 20px;
    padding: 25px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    z-index: 10001;
    opacity: 0;
    visibility: hidden;
    transform: translateY(20px);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 220px;
    border: 1px solid rgba(102, 126, 234, 0.1);
}

.paras_ai_capture_menu.paras_ai_capture_visible {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

.paras_ai_capture_menu h3 {
    margin: 0 0 20px 0;
    color: #2d3436;
    font-size: 18px;
    font-weight: 700;
    text-align: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.paras_ai_capture_menu_button {
    display: block;
    width: 100%;
    margin: 10px 0;
    padding: 15px 20px;
    background: rgba(255, 255, 255, 0.9);
    color: #2d3436;
    border: 2px solid rgba(102, 126, 234, 0.2);
    border-radius: 12px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    text-align: left;
    backdrop-filter: blur(5px);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.paras_ai_capture_menu_button:hover {
    transform: translateX(5px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.2);
    border-color: #6c5ce7;
    background: rgba(108, 92, 231, 0.05);
}

.paras_ai_capture_menu_button.paras_ai_capture_page_capture {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
}

.paras_ai_capture_menu_button.paras_ai_capture_viewport_capture {
    background: linear-gradient(135deg, rgba(108, 92, 231, 0.1) 0%, rgba(169, 155, 254, 0.1) 100%);
}

.paras_ai_capture_menu_button.paras_ai_capture_settings {
    background: linear-gradient(135deg, rgba(253, 203, 110, 0.1) 0%, rgba(232, 67, 147, 0.1) 100%);
}

.paras_ai_capture_menu_button.paras_ai_capture_cancel {
    background: linear-gradient(135deg, rgba(99, 110, 114, 0.1) 0%, rgba(45, 52, 54, 0.1) 100%);
}

/* 品質設定モーダル */
.paras_ai_capture_modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(45, 52, 54, 0.6);
    backdrop-filter: blur(8px);
    z-index: 10002;
    display: none;
    align-items: center;
    justify-content: center;
}

.paras_ai_capture_modal.paras_ai_capture_visible {
    display: flex;
}

.paras_ai_capture_modal_content {
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(20px);
    border-radius: 20px;
    padding: 35px;
    max-width: 450px;
    width: 90%;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 15px 50px rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(102, 126, 234, 0.1);
    animation: fadeInUp 0.4s ease;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.paras_ai_capture_modal_header {
    margin-bottom: 25px;
    text-align: center;
    padding-bottom: 15px;
    border-bottom: 2px solid rgba(102, 126, 234, 0.1);
}

.paras_ai_capture_modal_header h3 {
    margin: 0;
    color: #2d3436;
    font-size: 22px;
    font-weight: 700;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.paras_ai_capture_setting_group {
    margin: 25px 0;
    background: rgba(248, 249, 250, 0.8);
    padding: 20px;
    border-radius: 12px;
    border-left: 4px solid #6c5ce7;
}

.paras_ai_capture_setting_group label {
    display: block;
    margin-bottom: 12px;
    color: #2d3436;
    font-weight: 600;
    font-size: 15px;
}

.paras_ai_capture_setting_group select,
.paras_ai_capture_setting_group input[type="range"] {
    width: 100%;
    padding: 12px 15px;
    border: 2px solid rgba(225, 229, 233, 0.8);
    border-radius: 10px;
    font-size: 14px;
    background: rgba(255, 255, 255, 0.9);
    color: #2d3436;
    transition: all 0.3s ease;
    backdrop-filter: blur(5px);
}

.paras_ai_capture_setting_group select:focus,
.paras_ai_capture_setting_group input[type="range"]:focus {
    outline: none;
    border-color: #6c5ce7;
    box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
}

.paras_ai_capture_setting_group select:hover,
.paras_ai_capture_setting_group input[type="range"]:hover {
    border-color: rgba(108, 92, 231, 0.5);
}

.paras_ai_capture_range_container {
    display: flex;
    align-items: center;
    gap: 15px;
}

.paras_ai_capture_range_value {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 10px 15px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: bold;
    min-width: 70px;
    text-align: center;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}

.paras_ai_capture_modal_buttons {
    display: flex;
    gap: 15px;
    margin-top: 35px;
    padding-top: 25px;
    border-top: 1px solid rgba(225, 229, 233, 0.8);
}

.paras_ai_capture_modal_button {
    flex: 1;
    padding: 15px 25px;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 600;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    text-transform: none;
}

.paras_ai_capture_modal_button.paras_ai_capture_save {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.paras_ai_capture_modal_button.paras_ai_capture_cancel {
    background: rgba(99, 110, 114, 0.1);
    color: #636e72;
    border: 2px solid rgba(99, 110, 114, 0.2);
}

.paras_ai_capture_modal_button:hover {
    transform: translateY(-2px);
}

.paras_ai_capture_modal_button.paras_ai_capture_save:hover {
    box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    background: linear-gradient(135deg, #8a7ce8 0%, #8e6bb8 100%);
}

.paras_ai_capture_modal_button.paras_ai_capture_cancel:hover {
    background: rgba(99, 110, 114, 0.15);
    border-color: rgba(99, 110, 114, 0.3);
}

/* プログレス表示 */
.paras_ai_capture_progress {
    position: fixed;
    top: 25px;
    right: 25px;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(15px);
    border-radius: 15px;
    padding: 25px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    z-index: 10003;
    display: none;
    min-width: 280px;
    border: 1px solid rgba(102, 126, 234, 0.1);
    animation: slideInRight 0.4s ease;
}

@keyframes slideInRight {
    from {
        opacity: 0;
        transform: translateX(100%);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.paras_ai_capture_progress.paras_ai_capture_visible {
    display: block;
}

.paras_ai_capture_progress_text {
    margin-bottom: 15px;
    color: #2d3436;
    font-weight: 600;
    text-align: center;
    font-size: 15px;
}

.paras_ai_capture_progress_bar_container {
    background: rgba(225, 229, 233, 0.8);
    border-radius: 10px;
    height: 10px;
    overflow: hidden;
    position: relative;
}

.paras_ai_capture_progress_bar {
    height: 100%;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    width: 0%;
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 10px;
    position: relative;
}

.paras_ai_capture_progress_bar::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
    animation: shimmer 2s infinite;
}

@keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}

/* 通知スタイル */
.paras_ai_capture_notification {
    position: fixed;
    top: 25px;
    right: 25px;
    padding: 18px 25px;
    border-radius: 12px;
    z-index: 10004;
    font-weight: 600;
    font-size: 15px;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    max-width: 350px;
    word-wrap: break-word;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
    .paras_ai_capture_floating_btn {
        bottom: 20px;
        right: 20px;
        width: 55px;
        height: 55px;
        font-size: 22px;
    }
    
    .paras_ai_capture_menu {
        bottom: 85px;
        right: 20px;
        min-width: 200px;
        padding: 20px;
    }
    
    .paras_ai_capture_menu h3 {
        font-size: 16px;
        margin-bottom: 15px;
    }
    
    .paras_ai_capture_menu_button {
        padding: 14px 18px;
        font-size: 14px;
        margin: 8px 0;
    }
    
    .paras_ai_capture_modal_content {
        padding: 25px 20px;
        margin: 15px;
        max-width: none;
        width: calc(100% - 30px);
    }
    
    .paras_ai_capture_modal_header h3 {
        font-size: 20px;
    }
    
    .paras_ai_capture_setting_group {
        margin: 20px 0;
        padding: 15px;
    }
    
    .paras_ai_capture_modal_buttons {
        flex-direction: column;
        gap: 10px;
    }
    
    .paras_ai_capture_modal_button {
        padding: 16px 20px;
        font-size: 16px;
        min-height: 48px;
    }
    
    .paras_ai_capture_progress {
        top: 15px;
        right: 15px;
        left: 15px;
        min-width: auto;
        padding: 20px;
    }
    
    .paras_ai_capture_notification {
        top: 15px;
        right: 15px;
        left: 15px;
        max-width: none;
        padding: 16px 20px;
    }
}

@media (max-width: 480px) {
    .paras_ai_capture_floating_btn {
        width: 50px;
        height: 50px;
        font-size: 20px;
        bottom: 15px;
        right: 15px;
    }
    
    .paras_ai_capture_menu {
        bottom: 75px;
        right: 15px;
        left: 15px;
        min-width: auto;
    }
    
    .paras_ai_capture_menu_button {
        padding: 16px 20px;
        font-size: 15px;
        min-height: 48px;
        touch-action: manipulation;
    }
    
    .paras_ai_capture_modal_content {
        margin: 10px;
        padding: 20px 15px;
        border-radius: 15px;
    }
    
    .paras_ai_capture_setting_group {
        padding: 12px;
    }
    
    .paras_ai_capture_range_container {
        flex-direction: column;
        gap: 10px;
        align-items: stretch;
    }
    
    .paras_ai_capture_range_value {
        text-align: center;
        min-width: auto;
    }
}

/* ダークモード対応 */
@media (prefers-color-scheme: dark) {
    .paras_ai_capture_menu {
        background: rgba(45, 52, 54, 0.95);
        border-color: rgba(102, 126, 234, 0.2);
    }
    
    .paras_ai_capture_menu h3 {
        color: #ffffff;
    }
    
    .paras_ai_capture_menu_button {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.1);
    }
    
    .paras_ai_capture_menu_button:hover {
        background: rgba(108, 92, 231, 0.2);
        border-color: rgba(108, 92, 231, 0.4);
    }
    
    .paras_ai_capture_modal_content {
        background: rgba(45, 52, 54, 0.98);
        border-color: rgba(102, 126, 234, 0.2);
    }
    
    .paras_ai_capture_modal_header h3 {
        color: #ffffff;
    }
    
    .paras_ai_capture_setting_group {
        background: rgba(255, 255, 255, 0.05);
    }
    
    .paras_ai_capture_setting_group label {
        color: #ffffff;
    }
    
    .paras_ai_capture_setting_group select,
    .paras_ai_capture_setting_group input[type="range"] {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.2);
    }
    
    .paras_ai_capture_progress {
        background: rgba(45, 52, 54, 0.98);
        border-color: rgba(102, 126, 234, 0.2);
    }
    
    .paras_ai_capture_progress_text {
        color: #ffffff;
    }
}

/* ハイコントラスト対応 */
@media (prefers-contrast: high) {
    .paras_ai_capture_floating_btn {
        border: 3px solid #ffffff;
    }
    
    .paras_ai_capture_menu {
        border: 2px solid #6c5ce7;
    }
    
    .paras_ai_capture_menu_button {
        border-width: 2px;
    }
    
    .paras_ai_capture_modal_content {
        border: 2px solid #6c5ce7;
    }
}

/* 減速アニメーション対応 */
@media (prefers-reduced-motion: reduce) {
    .paras_ai_capture_floating_btn,
    .paras_ai_capture_menu,
    .paras_ai_capture_modal,
    .paras_ai_capture_progress,
    .paras_ai_capture_notification,
    .paras_ai_capture_menu_button,
    .paras_ai_capture_modal_button {
        transition: none;
        animation: none;
    }
    
    .paras_ai_capture_progress_bar::after {
        animation: none;
    }
}

/* 印刷対応 */
@media print {
    .paras_ai_capture_floating_btn,
    .paras_ai_capture_menu,
    .paras_ai_capture_modal,
    .paras_ai_capture_progress,
    .paras_ai_capture_notification {
        display: none !important;
    }
}
        `;
        document.head.appendChild(style);
    }
    
    // フローティングボタンを作成
    createFloatingButton() {
        this.floatingBtn = document.createElement('button');
        this.floatingBtn.className = 'paras_ai_capture_floating_btn';
        this.floatingBtn.innerHTML = '📸';
        this.floatingBtn.title = '画面キャプチャ';
        
        this.floatingBtn.addEventListener('click', () => {
            this.toggleCaptureMenu();
        });
        
        document.body.appendChild(this.floatingBtn);
    }
    
    // キャプチャメニューを作成
    createCaptureMenu() {
        this.captureMenu = document.createElement('div');
        this.captureMenu.className = 'paras_ai_capture_menu';
        
        this.captureMenu.innerHTML = `
            <h3>📸 画面キャプチャ</h3>
            <button class="paras_ai_capture_menu_button paras_ai_capture_page_capture">
                📄 ページ全体
                <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">スクロール範囲含む</div>
            </button>
            <button class="paras_ai_capture_menu_button paras_ai_capture_viewport_capture">
                🖼️ 表示領域
                <div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">現在見えている部分</div>
            </button>
            <button class="paras_ai_capture_menu_button paras_ai_capture_settings">
                ⚙️ 品質設定
            </button>
            <button class="paras_ai_capture_menu_button paras_ai_capture_cancel">
                ❌ キャンセル
            </button>
        `;
        
        // イベントリスナー設定
        const buttons = this.captureMenu.querySelectorAll('.paras_ai_capture_menu_button');
        buttons[0].addEventListener('click', () => this.capturePageFull());
        buttons[1].addEventListener('click', () => this.captureViewport());
        buttons[2].addEventListener('click', () => this.showQualityModal());
        buttons[3].addEventListener('click', () => this.hideCaptureMenu());
        
        document.body.appendChild(this.captureMenu);
    }
    
    // 品質設定モーダルを作成
    createQualityModal() {
        this.qualityModal = document.createElement('div');
        this.qualityModal.className = 'paras_ai_capture_modal';
        
        this.qualityModal.innerHTML = `
            <div class="paras_ai_capture_modal_content">
                <div class="paras_ai_capture_modal_header">
                    <h3>⚙️ 品質設定</h3>
                </div>
                
                <div class="paras_ai_capture_setting_group">
                    <label>解像度倍率</label>
                    <div class="paras_ai_capture_range_container">
                        <input type="range" id="paras_ai_capture_scale_slider" min="1" max="4" step="0.5" value="${this.settings.scale}">
                        <div class="paras_ai_capture_range_value" id="paras_ai_capture_scale_value">${this.settings.scale.toFixed(1)}x</div>
                    </div>
                </div>
                
                <div class="paras_ai_capture_setting_group">
                    <label>画像フォーマット</label>
                    <select id="paras_ai_capture_format_select">
                        <option value="png" ${this.settings.format === 'png' ? 'selected' : ''}>PNG (最高品質・無圧縮)</option>
                        <option value="jpeg" ${this.settings.format === 'jpeg' ? 'selected' : ''}>JPEG (高圧縮)</option>
                        <option value="webp" ${this.settings.format === 'webp' ? 'selected' : ''}>WebP (次世代フォーマット)</option>
                    </select>
                </div>
                
                <div class="paras_ai_capture_setting_group" id="paras_ai_capture_quality_group" style="display: ${this.settings.format === 'jpeg' || this.settings.format === 'webp' ? 'block' : 'none'};">
                    <label>圧縮品質</label>
                    <div class="paras_ai_capture_range_container">
                        <input type="range" id="paras_ai_capture_quality_slider" min="0.1" max="1" step="0.1" value="${this.settings.quality}">
                        <div class="paras_ai_capture_range_value" id="paras_ai_capture_quality_value">${Math.round(this.settings.quality * 100)}%</div>
                    </div>
                </div>
                
                <div class="paras_ai_capture_setting_group">
                    <label>背景色</label>
                    <select id="paras_ai_capture_background_select">
                        <option value="transparent" ${this.settings.backgroundColor === 'transparent' ? 'selected' : ''}>透明</option>
                        <option value="white" ${this.settings.backgroundColor === 'white' ? 'selected' : ''}>白</option>
                        <option value="black" ${this.settings.backgroundColor === 'black' ? 'selected' : ''}>黒</option>
                        <option value="auto" ${this.settings.backgroundColor === 'auto' ? 'selected' : ''}>自動</option>
                    </select>
                </div>
                
                <div class="paras_ai_capture_modal_buttons">
                    <button class="paras_ai_capture_modal_button paras_ai_capture_save">💾 保存</button>
                    <button class="paras_ai_capture_modal_button paras_ai_capture_cancel">❌ キャンセル</button>
                </div>
            </div>
        `;
        
        this.setupModalEventListeners();
        document.body.appendChild(this.qualityModal);
    }
    
    // モーダルのイベントリスナー設定
    setupModalEventListeners() {
        // モーダル外クリックで閉じる
        this.qualityModal.addEventListener('click', (e) => {
            if (e.target === this.qualityModal) {
                this.hideQualityModal();
            }
        });
        
        // スライダーとセレクトボックスの更新処理
        setTimeout(() => {
            const scaleSlider = document.getElementById('paras_ai_capture_scale_slider');
            const scaleValue = document.getElementById('paras_ai_capture_scale_value');
            const formatSelect = document.getElementById('paras_ai_capture_format_select');
            const qualityGroup = document.getElementById('paras_ai_capture_quality_group');
            const qualitySlider = document.getElementById('paras_ai_capture_quality_slider');
            const qualityValue = document.getElementById('paras_ai_capture_quality_value');
            const saveBtn = this.qualityModal.querySelector('.paras_ai_capture_modal_button.paras_ai_capture_save');
            const cancelBtn = this.qualityModal.querySelector('.paras_ai_capture_modal_button.paras_ai_capture_cancel');
            
            scaleSlider?.addEventListener('input', () => {
                const value = parseFloat(scaleSlider.value);
                scaleValue.textContent = value.toFixed(1) + 'x';
            });
            
            qualitySlider?.addEventListener('input', () => {
                const value = parseFloat(qualitySlider.value);
                qualityValue.textContent = Math.round(value * 100) + '%';
            });
            
            formatSelect?.addEventListener('change', () => {
                const format = formatSelect.value;
                qualityGroup.style.display = (format === 'jpeg' || format === 'webp') ? 'block' : 'none';
            });
            
            saveBtn?.addEventListener('click', () => this.saveQualitySettings());
            cancelBtn?.addEventListener('click', () => this.hideQualityModal());
        }, 100);
    }
    
    // プログレス表示を作成
    createProgressDisplay() {
        if (this.progressDisplay) return;
        
        this.progressDisplay = document.createElement('div');
        this.progressDisplay.className = 'paras_ai_capture_progress';
        
        this.progressDisplay.innerHTML = `
            <div class="paras_ai_capture_progress_text">キャプチャ処理中...</div>
            <div class="paras_ai_capture_progress_bar_container">
                <div class="paras_ai_capture_progress_bar"></div>
            </div>
        `;
        
        document.body.appendChild(this.progressDisplay);
    }
    
    // スクロール検知設定
    setupScrollDetection() {
        let scrollTimer = null;
        
        window.addEventListener('scroll', () => {
            this.isScrolling = true;
            this.hideFloatingButton();
            
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(() => {
                this.isScrolling = false;
                this.showFloatingButton();
            }, 1000); // 1秒間スクロールが停止したら表示
        });
        
        // 初期状態では表示
        setTimeout(() => {
            if (!this.isScrolling) {
                this.showFloatingButton();
            }
        }, 500);
    }
    
    // フローティングボタン表示/非表示
    showFloatingButton() {
        if (!this.isMenuVisible) {
            this.floatingBtn.classList.add('paras_ai_capture_visible');
        }
    }
    
    hideFloatingButton() {
        this.floatingBtn.classList.remove('paras_ai_capture_visible');
    }
    
    // キャプチャメニュー表示/非表示
    toggleCaptureMenu() {
        if (this.isMenuVisible) {
            this.hideCaptureMenu();
        } else {
            this.showCaptureMenu();
        }
    }
    
    showCaptureMenu() {
        this.isMenuVisible = true;
        this.captureMenu.classList.add('paras_ai_capture_visible');
        this.hideFloatingButton();
    }
    
    hideCaptureMenu() {
        this.isMenuVisible = false;
        this.captureMenu.classList.remove('paras_ai_capture_visible');
        this.showFloatingButton();
    }
    
    // 品質設定モーダル表示/非表示
    showQualityModal() {
        this.qualityModal.classList.add('paras_ai_capture_visible');
    }
    
    hideQualityModal() {
        this.qualityModal.classList.remove('paras_ai_capture_visible');
    }
    
    // 品質設定保存
    saveQualitySettings() {
        const scaleSlider = document.getElementById('paras_ai_capture_scale_slider');
        const formatSelect = document.getElementById('paras_ai_capture_format_select');
        const qualitySlider = document.getElementById('paras_ai_capture_quality_slider');
        const backgroundSelect = document.getElementById('paras_ai_capture_background_select');
        
        this.settings.scale = parseFloat(scaleSlider.value);
        this.settings.format = formatSelect.value;
        this.settings.quality = parseFloat(qualitySlider.value);
        this.settings.backgroundColor = backgroundSelect.value;
        
        this.hideQualityModal();
        
        // 設定保存完了の通知
        this.showNotification('品質設定を保存しました', 'success');
    }
    
    // プログレス表示
    showProgress(message, percent) {
        this.createProgressDisplay();
        this.progressDisplay.classList.add('paras_ai_capture_visible');
        
        const progressText = this.progressDisplay.querySelector('.paras_ai_capture_progress_text');
        const progressBar = this.progressDisplay.querySelector('.paras_ai_capture_progress_bar');
        
        progressText.textContent = message;
        progressBar.style.width = percent + '%';
    }
    
    hideProgress() {
        if (this.progressDisplay) {
            this.progressDisplay.classList.remove('paras_ai_capture_visible');
        }
    }
    
    // 通知表示
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = 'paras_ai_capture_notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#00b894' : type === 'error' ? '#e17055' : '#74b9ff'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            z-index: 10004;
            font-weight: bold;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // アニメーション
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // 自動削除
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, duration);
    }
    
    // html2canvasオプション生成（ページ全体専用）
    getHtml2CanvasOptions() {
        const options = {
            scale: this.settings.scale,
            useCORS: true,
            allowTaint: false,
            removeContainer: true,
            imageTimeout: 0,
            logging: false
        };
        
        // 背景色設定
        if (this.settings.backgroundColor !== 'transparent') {
            if (this.settings.backgroundColor === 'auto') {
                options.backgroundColor = window.getComputedStyle(document.body).backgroundColor;
            } else {
                options.backgroundColor = this.settings.backgroundColor;
            }
        } else {
            options.backgroundColor = null;
        }
        
        return options;
    }
    
    // ページ全体キャプチャ
    async capturePageFull() {
        this.hideCaptureMenu();
        
        try {
            // html2canvasライブラリの存在確認
            if (typeof html2canvas === 'undefined') {
                throw new Error('html2canvas ライブラリが読み込まれていません');
            }

            this.showProgress('キャプチャの準備中...', 10);
            tempStyle = this.prepareForCapture();
            
            this.showProgress('ページ全体をキャプチャ中...', 20);
            
            const options = this.getHtml2CanvasOptions();
            
            this.showProgress('要素を描画中...', 50);
            
            const canvas = await html2canvas(document.body, options);
            
            this.showProgress('画像を生成中...', 80);
            
            await this.processCapture(canvas, 'ページ全体');
            
            this.showProgress('完了！', 100);
            setTimeout(() => this.hideProgress(), 1000);
            
        } catch (error) {
            console.error('ページ全体キャプチャエラー:', error);
            this.hideProgress();
            this.showNotification('キャプチャに失敗しました: ' + error.message, 'error');
        } finally {
            this.cleanupAfterCapture(tempStyle);
        }
    }
    
    // 表示領域キャプチャ（修正版）
    async captureViewport() {
        this.hideCaptureMenu();
        
        try {
            if (typeof html2canvas === 'undefined') {
                throw new Error('html2canvas ライブラリが読み込まれていません');
            }

            this.showProgress('キャプチャの準備中...', 10);
            tempStyle = this.prepareForCapture();
            
            this.showProgress('表示領域をキャプチャ中...', 20);
            
            // 現在のスクロール位置を取得
            const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
            const scrollY = window.pageYOffset || document.documentElement.scrollTop;
                        
            // 表示領域専用のオプション
            const options = {
                scale: this.settings.scale,
                useCORS: true,
                allowTaint: false,
                removeContainer: true,
                imageTimeout: 0,
                logging: true,
                width: window.innerWidth,
                height: window.innerHeight,
                scrollX: scrollX,
                scrollY: scrollY,
                x: scrollX,
                y: scrollY
            };
            
            // 背景色設定
            if (this.settings.backgroundColor !== 'transparent') {
                if (this.settings.backgroundColor === 'auto') {
                    options.backgroundColor = window.getComputedStyle(document.body).backgroundColor;
                } else {
                    options.backgroundColor = this.settings.backgroundColor;
                }
            } else {
                options.backgroundColor = null;
            }
            
            console.log('html2canvasオプション:', options);
            
            this.showProgress('要素を描画中...', 50);
            
            const canvas = await html2canvas(document.body, options);
            
            this.showProgress('画像を生成中...', 80);
            
            await this.processCapture(canvas, '表示領域');
            
            this.showProgress('完了！', 100);
            setTimeout(() => this.hideProgress(), 1000);
            
        } catch (error) {
            console.error('表示領域キャプチャエラー:', error);
            this.hideProgress();
            this.showNotification('キャプチャに失敗しました: ' + error.message, 'error');
        } finally {
            this.cleanupAfterCapture(tempStyle);
        }
    }
    
    // キャプチャ処理共通部分
    async processCapture(canvas, targetName) {
        let quality = 1.0;
        
        if (this.settings.format === 'jpeg' || this.settings.format === 'webp') {
            quality = this.settings.quality;
        }
        
        const mimeType = `image/${this.settings.format}`;
        this.capturedImageData = canvas.toDataURL(mimeType, quality);
        
        // 自動ダウンロード
        this.downloadImage(targetName);
        
        // 成功通知
        const fileSize = Math.round((this.capturedImageData.length * 3/4) / 1024);
        this.showNotification(
            `${targetName}のキャプチャが完了しました (${canvas.width}×${canvas.height}px, ${fileSize}KB)`,
            'success',
            4000
        );
    }

    // CSS変数を動的に検出・解決する関数
    prepareForCapture() {
        const style = document.createElement('style');
        style.id = 'paras_ai_capture_css_fix';
        
        const htmlStyle = window.getComputedStyle(document.documentElement);
        const cssVars = this.detectCSSVariables(htmlStyle);
        
        console.log('検出されたCSS変数:', cssVars);
        
        const cssText = this.generateCSSVariableOverrides(cssVars);
        
        style.textContent = cssText;
        document.head.appendChild(style);
        
        // 強制的にスタイルを再計算させる
        document.body.offsetHeight; // リフロー強制
        
        console.log(`${Object.keys(cssVars).length}個のCSS変数を実際の値で上書きしました`);
        return style;
    }

    // CSS変数を動的に検出する関数
    detectCSSVariables(computedStyle) {
        const cssVars = {};
        
        // html要素のstyle属性から直接CSS変数を抽出
        const htmlElement = document.documentElement;
        const styleAttr = htmlElement.getAttribute('style');
        
        if (styleAttr) {
            // CSS変数のパターンにマッチする正規表現
            const cssVarPattern = /--([^:]+):\s*([^;]+);?/g;
            let match;
            
            while ((match = cssVarPattern.exec(styleAttr)) !== null) {
                const varName = `--${match[1].trim()}`;
                const varValue = match[2].trim();
                
                // 実際の計算値を取得
                const computedValue = computedStyle.getPropertyValue(varName).trim();
                
                if (computedValue) {
                    cssVars[varName] = computedValue;
                } else if (varValue) {
                    // フォールバックとして直接値を使用
                    cssVars[varName] = varValue;
                }
            }
        }
        
        // 追加で一般的なCSS変数パターンを検査
        const commonPrefixes = ['color', 'font', 'background', 'text', 'primary', 'surface'];
        
        for (const prefix of commonPrefixes) {
            // CSS変数名のパターンを推測して検査
            for (let i = 0; i < 20; i++) {
                const patterns = [
                    `--${prefix}_default`,
                    `--${prefix}_default_rgb`,
                    `--color_${prefix}_default`,
                    `--color_${prefix}_default_rgb`,
                    `--color_b${String.fromCharCode(65 + i)}${String.fromCharCode(65 + i)}_default`,
                    `--color_bT${String.fromCharCode(65 + i)}T${String.fromCharCode(65 + i)}${i}_default`
                ];
                
                for (const pattern of patterns) {
                    const value = computedStyle.getPropertyValue(pattern).trim();
                    if (value && !cssVars[pattern]) {
                        cssVars[pattern] = value;
                    }
                }
            }
        }
        
        return cssVars;
    }

    // CSS変数を上書きするスタイルを生成
    generateCSSVariableOverrides(cssVars) {
        let cssText = '/* html2canvas用CSS変数解決 */\n';
        
        // 重要な背景色とテキスト色を優先的に処理
        const backgroundVar = this.findVariableByPattern(cssVars, ['background', 'bg']);
        const textVar = this.findVariableByPattern(cssVars, ['text']);
        const fontVar = this.findVariableByPattern(cssVars, ['font']);
        
        cssText += `
            html, body {
                ${backgroundVar ? `background-color: ${backgroundVar} !important;` : ''}
                ${textVar ? `color: ${textVar} !important;` : ''}
                ${fontVar ? `font-family: ${fontVar} !important;` : ''}
            }
            
            .main-container, .content-card, .header {
                ${backgroundVar ? `background-color: ${backgroundVar} !important;` : ''}
            }
        `;
        
        // 全CSS変数を:root擬似クラスで上書き
        cssText += '\n:root {\n';
        
        for (const [varName, varValue] of Object.entries(cssVars)) {
            cssText += `    ${varName}: ${varValue} !important;\n`;
        }
        
        cssText += '}\n';
        
        // 全要素に対してもCSS変数を適用
        cssText += '\n* {\n';
        
        for (const [varName, varValue] of Object.entries(cssVars)) {
            cssText += `    ${varName}: ${varValue} !important;\n`;
        }
        
        cssText += '}\n';
        
        return cssText;
    }

    // パターンマッチングでCSS変数を検索
    findVariableByPattern(cssVars, patterns) {
        for (const pattern of patterns) {
            for (const [varName, varValue] of Object.entries(cssVars)) {
                if (varName.toLowerCase().includes(pattern.toLowerCase()) && 
                    varValue && 
                    varValue !== 'transparent' && 
                    varValue !== 'rgba(0, 0, 0, 0)') {
                    return varValue;
                }
            }
        }
        return null;
    }

    // キャプチャ後のクリーンアップ
    cleanupAfterCapture(tempStyle) {
        if (tempStyle && tempStyle.parentNode) {
            tempStyle.parentNode.removeChild(tempStyle);
        }
    }

    // 更新されたgetActualBackgroundColor
    getActualBackgroundColor() {
        const htmlStyle = window.getComputedStyle(document.documentElement);
        const cssVars = this.detectCSSVariables(htmlStyle);
        
        // 背景色系の変数を優先的に検索
        const backgroundPatterns = [
            'background_default',
            'bg_default', 
            'surface_default',
            'background',
            'bg'
        ];
        
        const backgroundVar = this.findVariableByPattern(cssVars, backgroundPatterns);
        
        if (backgroundVar) {
            console.log('CSS変数から背景色取得:', backgroundVar);
            return backgroundVar;
        }
        
        // フォールバック処理
        const fallbackMethods = [
            () => window.getComputedStyle(document.body).backgroundColor,
            () => window.getComputedStyle(document.querySelector('.main-container'))?.backgroundColor,
            () => window.getComputedStyle(document.querySelector('.content-card'))?.backgroundColor
        ];
        
        for (const method of fallbackMethods) {
            try {
                const color = method();
                if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
                    console.log('フォールバックから背景色取得:', color);
                    return color;
                }
            } catch (e) {
                continue;
            }
        }
        
        console.log('デフォルト背景色を使用');
        return 'white';
    }
    
    // 画像ダウンロード
    downloadImage(targetName) {
        if (!this.capturedImageData) return;
const timestamp = new Date().toISOString().slice(0,19).replace(/:/g,'-');
       const filename = `paras_ai_capture_${targetName.replace(/\s+/g, '_')}_${timestamp}.${this.settings.format}`;
       
       const link = document.createElement('a');
       link.href = this.capturedImageData;
       link.download = filename;
       document.body.appendChild(link);
       link.click();
       document.body.removeChild(link);
   }
}

// 自動初期化
document.addEventListener('DOMContentLoaded', function() {
   // html2canvasライブラリの読み込み確認
   function checkHtml2Canvas() {
       if (typeof html2canvas !== 'undefined') {
           // ライブラリが読み込まれている場合、システムを初期化
           window.parasAICaptureSystem = new ParasAICaptureSystem();
       } else {
           // ライブラリが読み込まれていない場合、1秒後に再チェック
           setTimeout(checkHtml2Canvas, 1000);
       }
   }
   
   checkHtml2Canvas();
});

// 手動初期化用の関数もエクスポート
window.initParasAIFloatingCapture = function() {
   if (window.parasAICaptureSystem) {
       return window.parasAICaptureSystem;
   }
   
   window.parasAICaptureSystem = new ParasAICaptureSystem();
   return window.parasAICaptureSystem;
};
