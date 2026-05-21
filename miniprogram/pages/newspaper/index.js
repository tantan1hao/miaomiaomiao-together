"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../../utils/api");
const SCHOOL_ID = 'bistu';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const EDITION_COUNT = 4;
const KEY_TURN_THRESHOLD = 0.34;
const KEY_TURN_RANGE = 210;
const sampleDishes = [
    {
        id: 'sample-1',
        name: '黄焖鸡米饭',
        description: '酱香浓郁，土豆软糯，是不知道吃什么时最稳的一道。',
        imageUrl: '',
        categoryName: '盖饭',
        placeText: '一食堂 · 一楼 · 黄焖鸡米饭',
        scoreText: '4.9',
        ratingText: '126 人评分',
        headline: '午饭前的稳妥答案仍然来自黄焖鸡窗口',
        canRate: false,
    },
    {
        id: 'sample-2',
        name: '麻辣香锅',
        description: '适合多人拼单，辣度稳定，午饭高峰也很有存在感。',
        imageUrl: '',
        categoryName: '麻辣',
        placeText: '一食堂 · 一楼 · 麻辣香锅',
        scoreText: '4.7',
        ratingText: '94 人评分',
        headline: '麻辣香锅在多人拼单中继续占据显眼位置',
        canRate: false,
    },
    {
        id: 'sample-3',
        name: '桂林米粉',
        description: '出餐快，汤粉和拌粉都适合赶课前后。',
        imageUrl: '',
        categoryName: '粉面',
        placeText: '二食堂 · 一楼 · 桂林米粉',
        scoreText: '4.6',
        ratingText: '72 人评分',
        headline: '赶课同学把桂林米粉推上速度榜',
        canRate: false,
    },
];
const sampleCategories = [
    { id: 'cat-1', name: '盖饭' },
    { id: 'cat-2', name: '粉面' },
    { id: 'cat-3', name: '麻辣' },
    { id: 'cat-4', name: '饮品' },
];
function formatTwo(value) {
    return value < 10 ? `0${value}` : `${value}`;
}
function normalizeDish(dish) {
    const place = [dish.canteenName, dish.floorName, dish.shopName].filter(Boolean).join(' · ');
    const name = dish.name || '未命名菜品';
    const description = dish.description || '等待同学补充风味记录。';
    return {
        id: dish.id,
        name,
        description,
        imageUrl: dish.imageUrl || '',
        categoryName: dish.categoryName || '未分类',
        placeText: place || '校园食堂',
        scoreText: Number(dish.avgScore || 0).toFixed(1),
        ratingText: `${dish.ratingCount || 0} 人评分`,
        headline: `${name} 登上今日食堂版面`,
        canRate: true,
    };
}
function pickDish(rows, index) {
    return rows[index] || rows[0] || sampleDishes[0];
}
Page({
    data: {
        statusBarHeight: 0,
        readerTop: 10,
        canvasWidth: 375,
        canvasHeight: 812,
        currentIndex: 0,
        pageNumber: '01',
        pageTotal: formatTwo(EDITION_COUNT),
        editionDate: '',
        networkNote: '样张模式',
        foldVisible: false,
        foldDirection: '',
        foldStyle: '',
        turnCanvasVisible: false,
        leadDish: sampleDishes[0],
        featureDish: sampleDishes[1],
        thirdDish: sampleDishes[2],
        rankingRows: sampleDishes,
        categoryRows: sampleCategories,
        ratingScoreOptions: [1, 2, 3, 4, 5],
        announcementText: '今日榜单正在整理，欢迎投递你在食堂发现的好味道。',
        showSubmitSheet: false,
        submitting: false,
        imagePath: '',
        imageName: '',
        form: {
            name: '',
            categoryName: '',
            shopName: '',
            floorName: '',
            description: '',
        },
    },
    dragStartX: 0,
    dragStartY: 0,
    lastTouchX: 0,
    lastFoldDirection: '',
    turnDirection: '',
    turnTargetIndex: -1,
    turnProgress: 0,
    turnTimer: 0,
    foldTimer: 0,
    dishes: sampleDishes,
    categoriesCache: sampleCategories,
    onLoad() {
        this.setupPage();
        this.loadNewspaperData();
    },
    onUnload() {
        if (this.foldTimer)
            clearTimeout(this.foldTimer);
        if (this.turnTimer)
            clearInterval(this.turnTimer);
    },
    setupPage() {
        const system = wx.getSystemInfoSync();
        const now = new Date();
        this.setData({
            statusBarHeight: system.statusBarHeight || 0,
            readerTop: (system.statusBarHeight || 0) + 10,
            canvasWidth: system.windowWidth,
            canvasHeight: system.windowHeight,
            editionDate: `${now.getFullYear()}.${formatTwo(now.getMonth() + 1)}.${formatTwo(now.getDate())}`,
            pageNumber: formatTwo(this.data.currentIndex + 1),
        });
    },
    async loadNewspaperData() {
        this.setData({ networkNote: '正在更新' });
        try {
            const [rankRows, categoryRows, announcementText] = await Promise.all([
                (0, api_1.rankings)(SCHOOL_ID, 20),
                (0, api_1.categories)(SCHOOL_ID),
                (0, api_1.announcement)(SCHOOL_ID),
            ]);
            this.dishes = rankRows.length ? rankRows.map(normalizeDish) : sampleDishes;
            this.categoriesCache = categoryRows.length ? categoryRows : sampleCategories;
            this.setNewspaperData(rankRows.length ? '实时数据' : '暂无真实菜品', announcementText || '暂无公告，今日编辑部把版面留给同学投稿。');
        }
        catch (error) {
            this.dishes = sampleDishes;
            this.categoriesCache = sampleCategories;
            this.setNewspaperData('离线样张', '后端暂未连接，当前展示报纸样张。');
        }
    },
    setNewspaperData(networkNote, announcementText) {
        this.setData({
            networkNote,
            announcementText,
            leadDish: pickDish(this.dishes, 0),
            featureDish: pickDish(this.dishes, 1),
            thirdDish: pickDish(this.dishes, 2),
            rankingRows: this.dishes.slice(0, 8),
            categoryRows: this.categoriesCache.slice(0, 10),
        });
    },
    onSwiperChange(event) {
        const currentIndex = Number(event.detail.current || 0);
        if (currentIndex === this.data.currentIndex)
            return;
        this.setData({
            currentIndex,
            pageNumber: formatTwo(currentIndex + 1),
            foldVisible: false,
            foldDirection: '',
            foldStyle: '',
            turnCanvasVisible: false,
        });
    },
    goEdition(event) {
        const target = Number(event.currentTarget.dataset.target);
        if (Number.isNaN(target))
            return;
        this.setData({
            currentIndex: target,
            pageNumber: formatTwo(target + 1),
        });
    },
    onReaderTouchStart(event) {
        const touch = event.touches[0];
        if (!touch)
            return;
        if (this.foldTimer)
            clearTimeout(this.foldTimer);
        if (this.turnTimer)
            clearInterval(this.turnTimer);
        this.dragStartX = touch.clientX;
        this.dragStartY = touch.clientY;
        this.lastTouchX = touch.clientX;
        this.lastFoldDirection = '';
        this.turnDirection = '';
        this.turnTargetIndex = -1;
        this.turnProgress = 0;
    },
    onReaderTouchMove(event) {
        const touch = event.touches[0];
        if (!touch)
            return;
        const dx = touch.clientX - this.dragStartX;
        const dy = touch.clientY - this.dragStartY;
        this.lastTouchX = touch.clientX;
        if (Math.abs(dx) < 14 || Math.abs(dx) < Math.abs(dy))
            return;
        const direction = dx < 0 ? 'next' : 'prev';
        const progress = Math.min(1, Math.abs(dx) / KEY_TURN_RANGE);
        const targetIndex = this.getKeyTurnTarget(direction);
        if (targetIndex >= 0) {
            this.turnDirection = direction;
            this.turnTargetIndex = targetIndex;
            this.turnProgress = progress;
            if (!this.data.turnCanvasVisible) {
                this.setData({
                    turnCanvasVisible: true,
                    foldVisible: false,
                    foldDirection: '',
                    foldStyle: '',
                });
                wx.nextTick(() => {
                    this.renderKeyTurnCanvas(progress, direction, targetIndex);
                });
            }
            else {
                this.renderKeyTurnCanvas(progress, direction, targetIndex);
            }
            return;
        }
        const width = 52 + progress * 155;
        const opacity = 0.2 + progress * 0.42;
        if (direction !== this.lastFoldDirection || progress > 0.16) {
            this.lastFoldDirection = direction;
            this.setData({
                foldVisible: true,
                foldDirection: direction,
                foldStyle: `top: ${this.data.readerTop + 7}px; bottom: 7px; width: ${width}px; opacity: ${opacity};`,
            });
        }
    },
    onReaderTouchEnd() {
        if (this.data.turnCanvasVisible && this.turnDirection && this.turnTargetIndex >= 0) {
            const shouldTurn = this.turnProgress >= KEY_TURN_THRESHOLD;
            this.animateKeyTurn(this.turnProgress, shouldTurn ? 1 : 0, this.turnDirection, this.turnTargetIndex);
            return;
        }
        if (!this.data.foldVisible)
            return;
        if (this.foldTimer)
            clearTimeout(this.foldTimer);
        this.setData({
            foldStyle: `top: ${this.data.readerTop + 7}px; bottom: 7px; width: 34px; opacity: 0.05;`,
        });
        this.foldTimer = setTimeout(() => {
            this.setData({
                foldVisible: false,
                foldDirection: '',
                foldStyle: '',
            });
            this.foldTimer = 0;
        }, 180);
    },
    getKeyTurnTarget(direction) {
        const currentIndex = Number(this.data.currentIndex || 0);
        if (direction === 'next')
            return currentIndex < EDITION_COUNT - 1 ? currentIndex + 1 : -1;
        if (direction === 'prev')
            return currentIndex > 0 ? currentIndex - 1 : -1;
        return -1;
    },
    animateKeyTurn(startProgress, endProgress, direction, targetIndex) {
        let progress = startProgress;
        const step = endProgress > startProgress ? 0.08 : -0.08;
        if (this.turnTimer)
            clearInterval(this.turnTimer);
        this.turnTimer = setInterval(() => {
            progress += step;
            const done = step > 0 ? progress >= endProgress : progress <= endProgress;
            const safeProgress = done ? endProgress : progress;
            this.turnProgress = safeProgress;
            this.renderKeyTurnCanvas(safeProgress, direction, targetIndex);
            if (!done)
                return;
            clearInterval(this.turnTimer);
            this.turnTimer = 0;
            if (endProgress === 1) {
                this.setData({
                    currentIndex: targetIndex,
                    pageNumber: formatTwo(targetIndex + 1),
                });
            }
            this.setData({ turnCanvasVisible: false });
            this.turnDirection = '';
            this.turnTargetIndex = -1;
            this.turnProgress = 0;
        }, 16);
    },
    renderKeyTurnCanvas(progress, direction, targetIndex) {
        const ctx = wx.createCanvasContext('pageTurnCanvas', this);
        const width = this.data.canvasWidth;
        const height = this.data.canvasHeight;
        const top = this.data.readerTop;
        const x = 7;
        const y = top;
        const paperWidth = width - 14;
        const paperHeight = height - top - 7;
        const clamped = Math.max(0.02, Math.min(1, progress));
        const foldWidth = 34 + paperWidth * 0.86 * clamped;
        ctx.clearRect(0, 0, width, height);
        ctx.setFillStyle(`rgba(0, 0, 0, ${0.035 + clamped * 0.18})`);
        ctx.fillRect(x, y, paperWidth, paperHeight);
        if (direction === 'next') {
            this.drawRightTurnSheet(ctx, x, y, paperWidth, paperHeight, foldWidth, clamped, targetIndex);
        }
        else {
            this.drawLeftTurnSheet(ctx, x, y, paperHeight, foldWidth, clamped, targetIndex);
        }
        ctx.draw();
    },
    drawRightTurnSheet(ctx, x, y, paperWidth, paperHeight, foldWidth, progress, targetIndex) {
        const right = x + paperWidth;
        const foldLeft = right - foldWidth;
        const curve = 14 + progress * 32;
        const shadow = ctx.createLinearGradient(foldLeft - 16, y, foldLeft + 34, y);
        shadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
        shadow.addColorStop(0.46, `rgba(0, 0, 0, ${0.18 + progress * 0.22})`);
        shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.setFillStyle(shadow);
        ctx.fillRect(foldLeft - 18, y + 2, 64, paperHeight - 4);
        const back = ctx.createLinearGradient(foldLeft, y, right, y);
        back.addColorStop(0, '#deded9');
        back.addColorStop(0.13, '#f8f8f4');
        back.addColorStop(0.56, '#f6f6f2');
        back.addColorStop(0.86, '#e8e8e3');
        back.addColorStop(1, '#c9c9c3');
        ctx.setFillStyle(back);
        ctx.beginPath();
        ctx.moveTo(right, y);
        ctx.lineTo(right, y + paperHeight);
        ctx.lineTo(foldLeft + 10, y + paperHeight);
        ctx.quadraticCurveTo(foldLeft + curve, y + paperHeight * 0.52, foldLeft + 10, y);
        ctx.closePath();
        ctx.fill();
        this.drawTurnFibers(ctx, foldLeft + 9, y + 10, foldWidth - 18, paperHeight - 20);
        this.drawTurnContent(ctx, foldLeft + 18, y + 22, foldWidth - 36, targetIndex, true);
        ctx.setStrokeStyle(`rgba(0, 0, 0, ${0.32 + progress * 0.2})`);
        ctx.setLineWidth(1.5);
        ctx.beginPath();
        ctx.moveTo(foldLeft + 10, y);
        ctx.quadraticCurveTo(foldLeft + curve, y + paperHeight * 0.52, foldLeft + 10, y + paperHeight);
        ctx.stroke();
    },
    drawLeftTurnSheet(ctx, x, y, paperHeight, foldWidth, progress, targetIndex) {
        const foldRight = x + foldWidth;
        const curve = 14 + progress * 32;
        const shadow = ctx.createLinearGradient(foldRight - 34, y, foldRight + 16, y);
        shadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
        shadow.addColorStop(0.54, `rgba(0, 0, 0, ${0.18 + progress * 0.22})`);
        shadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.setFillStyle(shadow);
        ctx.fillRect(foldRight - 46, y + 2, 64, paperHeight - 4);
        const back = ctx.createLinearGradient(x, y, foldRight, y);
        back.addColorStop(0, '#c9c9c3');
        back.addColorStop(0.14, '#e8e8e3');
        back.addColorStop(0.44, '#f6f6f2');
        back.addColorStop(0.87, '#f8f8f4');
        back.addColorStop(1, '#deded9');
        ctx.setFillStyle(back);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(foldRight - 10, y);
        ctx.quadraticCurveTo(foldRight - curve, y + paperHeight * 0.52, foldRight - 10, y + paperHeight);
        ctx.lineTo(x, y + paperHeight);
        ctx.closePath();
        ctx.fill();
        this.drawTurnFibers(ctx, x + 9, y + 10, foldWidth - 18, paperHeight - 20);
        this.drawTurnContent(ctx, x + 18, y + 22, foldWidth - 36, targetIndex, false);
        ctx.setStrokeStyle(`rgba(0, 0, 0, ${0.32 + progress * 0.2})`);
        ctx.setLineWidth(1.5);
        ctx.beginPath();
        ctx.moveTo(foldRight - 10, y);
        ctx.quadraticCurveTo(foldRight - curve, y + paperHeight * 0.52, foldRight - 10, y + paperHeight);
        ctx.stroke();
    },
    drawTurnFibers(ctx, x, y, width, height) {
        const safeWidth = Math.max(48, width);
        ctx.setLineWidth(1);
        ctx.setStrokeStyle('rgba(0, 0, 0, 0.032)');
        for (let index = 0; index < 12; index += 1) {
            const lineY = y + 12 + index * Math.max(12, height / 14);
            ctx.beginPath();
            ctx.moveTo(x, lineY);
            ctx.lineTo(x + safeWidth, lineY + (index % 2 === 0 ? 0.8 : -0.6));
            ctx.stroke();
        }
        ctx.setStrokeStyle('rgba(179, 25, 33, 0.045)');
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 18);
        ctx.lineTo(x + Math.min(safeWidth, 88), y + 18);
        ctx.stroke();
    },
    drawTurnContent(ctx, x, y, width, targetIndex, alignLeft) {
        const safeWidth = Math.max(90, width);
        const pageTitles = ['明天吃什么日报', '今日风味榜', '把新菜写进明天', '公告与分类索引'];
        const pageLabels = ['FRONT PAGE', 'RANKING', 'SUBMISSION', 'CLASSIFIEDS'];
        const headline = pageTitles[targetIndex] || pageTitles[0];
        const label = pageLabels[targetIndex] || pageLabels[0];
        const textX = alignLeft ? x : x + safeWidth;
        ctx.setTextAlign(alignLeft ? 'left' : 'right');
        ctx.setFillStyle('#b31921');
        ctx.setFontSize(10);
        ctx.fillText(label, textX, y);
        ctx.setFillStyle('rgba(0, 0, 0, 0.12)');
        ctx.fillText(headline, textX + (alignLeft ? 0.5 : -0.5), y + 34.5);
        ctx.setFillStyle('#0b0b0b');
        ctx.setFontSize(targetIndex === 1 ? 24 : 22);
        ctx.fillText(headline, textX, y + 34);
        ctx.setStrokeStyle('#0b0b0b');
        ctx.setLineWidth(2);
        ctx.beginPath();
        ctx.moveTo(x, y + 50);
        ctx.lineTo(x + safeWidth, y + 50);
        ctx.stroke();
        ctx.setStrokeStyle('#b31921');
        ctx.setLineWidth(1);
        ctx.beginPath();
        ctx.moveTo(x, y + 57);
        ctx.lineTo(x + Math.min(safeWidth, 92), y + 57);
        ctx.stroke();
        ctx.setFillStyle('#0b0b0b');
        ctx.setFontSize(12);
        const previewLines = [
            ['校园食堂独立观察', '头版头条与风味短讯', '白纸黑字绿色点缀'],
            ['名次   菜品           评分', '01    黄焖鸡米饭     4.9', '02    麻辣香锅       4.7', '03    桂林米粉       4.6'],
            ['投稿单 / 图片 / 窗口', '菜名 分类 楼层 描述', '进入明天版面'],
            ['公告栏 / 分类索引', '刷新今日版面', '回到头版'],
        ];
        const lines = previewLines[targetIndex] || previewLines[0];
        lines.forEach((line, index) => {
            ctx.fillText(line, textX, y + 86 + index * 24);
        });
        ctx.setFillStyle('#b31921');
        ctx.fillRect(alignLeft ? x : x + safeWidth - 34, y + 196, 34, 4);
        ctx.setTextAlign('left');
    },
    refreshData() {
        this.loadNewspaperData();
    },
    openSubmitSheet() {
        this.setData({ showSubmitSheet: true });
    },
    closeSubmitSheet() {
        this.setData({ showSubmitSheet: false });
    },
    onFormInput(event) {
        const field = event.currentTarget.dataset.field;
        this.setData({ [`form.${field}`]: event.detail.value });
    },
    chooseImage() {
        wx.chooseImage({
            count: 1,
            sizeType: ['compressed'],
            sourceType: ['album', 'camera'],
            success: (res) => {
                const imagePath = res.tempFilePaths[0];
                wx.getFileInfo({
                    filePath: imagePath,
                    success: (fileInfo) => {
                        if (fileInfo.size > MAX_IMAGE_SIZE) {
                            wx.showToast({ title: '图片不能超过 5MB', icon: 'none' });
                            return;
                        }
                        const parts = imagePath.split('/');
                        this.setData({
                            imagePath,
                            imageName: parts[parts.length - 1] || '已选择图片',
                        });
                    },
                });
            },
        });
    },
    clearImage() {
        this.setData({ imagePath: '', imageName: '' });
    },
    async onRateTap(event) {
        const dishId = String(event.currentTarget.dataset.dishId || '');
        const score = Number(event.currentTarget.dataset.score || 0);
        if (!dishId || !score || dishId.startsWith('sample-')) {
            wx.showToast({ title: '样张不能评分', icon: 'none' });
            return;
        }
        wx.showLoading({ title: '评分中' });
        try {
            const token = await (0, api_1.getUserToken)();
            await (0, api_1.rateDish)(token, dishId, score);
            wx.showToast({ title: '已评分', icon: 'success' });
            await this.loadNewspaperData();
        }
        catch (error) {
            wx.showToast({ title: error instanceof Error ? error.message : '评分失败', icon: 'none' });
        }
        finally {
            wx.hideLoading();
        }
    },
    resetSubmitForm() {
        this.setData({
            imagePath: '',
            imageName: '',
            form: {
                name: '',
                categoryName: '',
                shopName: '',
                floorName: '',
                description: '',
            },
        });
    },
    async submitDish() {
        const form = this.data.form;
        const name = form.name.trim();
        if (!name) {
            wx.showToast({ title: '先写菜名', icon: 'none' });
            return;
        }
        this.setData({ submitting: true });
        wx.showLoading({ title: '投稿中' });
        try {
            const token = await (0, api_1.getUserToken)();
            await (0, api_1.uploadDish)(token, {
                schoolId: SCHOOL_ID,
                name,
                categoryName: form.categoryName.trim(),
                description: form.description.trim(),
                shopName: form.shopName.trim(),
                floorName: form.floorName.trim(),
            }, this.data.imagePath);
            wx.showToast({ title: '已投稿', icon: 'success' });
            this.resetSubmitForm();
            this.setData({
                showSubmitSheet: false,
                currentIndex: 1,
                pageNumber: '02',
            });
            await this.loadNewspaperData();
        }
        catch (error) {
            wx.showToast({ title: error instanceof Error ? error.message : '投稿失败', icon: 'none' });
        }
        finally {
            wx.hideLoading();
            this.setData({ submitting: false });
        }
    },
});
