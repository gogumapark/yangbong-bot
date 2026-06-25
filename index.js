const express = require('express');
const app = express();

// ════════════════════════════════════════
// 웹 대시보드 API — index.js 상단에 추가
// app.get('/') 바로 위에 붙여넣으세요
// ════════════════════════════════════════

const fs = require('fs');
app.use(express.json({ limit: '10mb' }));

const CONTENT_FILE = './content.json';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234'; // ← Render 환경변수로 설정 권장

// content.json 없으면 초기화
if (!fs.existsSync(CONTENT_FILE)) {
    fs.writeFileSync(CONTENT_FILE, JSON.stringify({
        botName: '양봉이',
        botDescription: '',
        serverDescription: '',
        patchDescription: '',
        inviteUrl: ''
    }, null, 2));
}

// ── 콘텐츠 불러오기 ──
app.get('/api/content', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf-8'));
        res.json(data);
    } catch {
        res.status(500).json({ error: '파일 읽기 실패' });
    }
});

// ── 콘텐츠 저장 (비밀번호 검증) ──
app.post('/api/content', (req, res) => {
    const { password, botName, botDescription, serverDescription, patchDescription, inviteUrl, profileImage, botImage } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: '비밀번호 오류' });
    try {
        const existing = fs.existsSync(CONTENT_FILE)
            ? JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf-8'))
            : {};
        const data = {
            botName: botName ?? existing.botName ?? '양봉이',
            botDescription: botDescription ?? existing.botDescription ?? '',
            serverDescription: serverDescription ?? existing.serverDescription ?? '',
            patchDescription: patchDescription ?? existing.patchDescription ?? '',
            inviteUrl: inviteUrl ?? existing.inviteUrl ?? '',
            profileImage: profileImage ?? existing.profileImage ?? null,
            botImage: botImage ?? existing.botImage ?? null,
        };
        fs.writeFileSync(CONTENT_FILE, JSON.stringify(data, null, 2));
        res.json({ ok: true });
    } catch {
        res.status(500).json({ error: '저장 실패' });
    }
});

// ── 주식 현황 (티커용) ──
app.get('/api/stocks', async (req, res) => {
    try {
        // Stock 모델은 index.js 아래쪽에 정의되어 있으므로
        // 이 라우트는 mongoose 연결 후에도 정상 동작합니다
        const stocks = await Stock.find(
            { listed: true, deleted: { $ne: true } },
            { name: 1, price: 1, priceHistory: 1 }
        ).lean();
        res.json(stocks);
    } catch (err) {
        res.status(500).json({ error: '주식 조회 실패' });
    }
});

const path = require('path');
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});

const mongoose = require('mongoose');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const { AttachmentBuilder } = require('discord.js');

let aiChannelId = null;

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB 연결 성공!'))
    .catch(err => console.error('MongoDB 연결 실패:', err));

const moneySchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    money: { type: Number, default: 1000 },

    lastFortuneDate: { type: String, default: null },
    fortuneStreak: { type: Number, default: 0 },

    lastBegTime: { type: Date, default: null },

    lastGambleTime: { type: Date, default: null },

    deleteCost: { type: Number, default: 1000 },

    blackjackWins: { type: Number, default: 0 },
    gambleWins: { type: Number, default: 0 },

    stocks: {
        type: Map,
        of: Number,
        default: {}
    },

    stockAvgPrice: {
        type: Map,
        of: Number,
        default: {}
    },

    buyCooldowns: {
        type: Map,
        of: Date,
        default: {}
    },

    lastTax: { type: Number, default: 0 },
    lastTaxDate: { type: String, default: null },

    lastSubsidyDate: { type: String, default: null },
    recentCompanyCreatedAt: { type: Date, default: null },
    companyBoostUsed: { type: Boolean, default: false },
    gogumSubsidyUsed: { type: Boolean, default: false },

    crimeRisk: { type: Number, default: 0 },
    taxEvasionActive: { type: Boolean, default: false },
    taxEvasionSaved: { type: Number, default: 0 },
    stockManipUsed: { type: Boolean, default: false },
    stockManipUntil: { type: Date, default: null },
    crimeCount: { type: Number, default: 0 },

    loanAmount: { type: Number, default: 0 },
    loanDueAt: { type: Date, default: null },

    isBankrupt: { type: Boolean, default: false },
    bankruptBanUntil: { type: Date, default: null },
    minusBalance: { type: Number, default: 0 },
});

const stockSchema = new mongoose.Schema({
    name: { type: String, unique: true },
    owner: String,

    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },

    price: { type: Number, default: 100 },

    totalShares: { type: Number, default: 0 },

    listed: { type: Boolean, default: true },

    news: { type: [String], default: [] },

    downStreak: { type: Number, default: 0 },

    bearMarket: { type: Boolean, default: false },
    bearMarketCount: { type: Number, default: 0 },

    promotionLevel: { type: Number, default: 0 },

    lastChangedAt: { type: Date, default: Date.now },
    nextChangeAt: { type: Date, default: () => new Date(Date.now() + 600000) },

    pendingNews: { type: String, default: null },
    pendingPercent: { type: Number, default: null },
    pendingType: { type: String, default: null },

    fakeNewsActive: { type: Boolean, default: false },
    fakeNewsUntil: { type: Date, default: null },

    tradeBanUntil: { type: Date, default: null },

    lastPromoAt: { type: Date, default: null },

    promoCount: { type: Number, default: 0 },

    priceHistory: { type: [Number], default: [] },
    priceHistoryTimes: { type: [Date], default: [] },
});

const eventSchema = new mongoose.Schema({
    type: { type: String, unique: true },
    active: { type: Boolean, default: false },
    startedAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
});
const GameEvent = mongoose.model('GameEvent', eventSchema);

// =====================
// 유틸 함수
// =====================

function formatMoney(num) {
    return num.toLocaleString('ko-KR') + '원';
}

function padKo(str, len) {
    let width = 0;
    for (const ch of str) {
        width += /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/.test(ch) ? 2 : 1;
    }
    return str + ' '.repeat(Math.max(0, len - width));
}

const chartRenderer = new ChartJSNodeCanvas({
    width: 800,
    height: 400,
    backgroundColour: '#2b2d31'
});

async function generateStockChart(stock) {
    const history = stock.priceHistory || [];
    const times = stock.priceHistoryTimes || [];

    const data = history.length > 0 ? [...history, stock.price] : [stock.price];
    const labels = times.map((t) => {
        const d = new Date(t);
        return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    });
    labels.push('현재');

    const isUp = data[data.length - 1] >= data[0];
    const lineColor = isUp ? '#57f287' : '#ed4245';
    const fillColor = isUp ? 'rgba(87,242,135,0.1)' : 'rgba(237,66,69,0.1)';

    const config = {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: `${stock.name} 주가`,
                data,
                borderColor: lineColor,
                backgroundColor: fillColor,
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: lineColor,
            }]
        },
        options: {
            animation: false,
            plugins: {
                legend: {
                    labels: { color: '#ffffff', font: { size: 14 } }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#aaaaaa', maxRotation: 45 },
                    grid: { color: '#3a3a3a' }
                },
                y: {
                    ticks: {
                        color: '#aaaaaa',
                        callback: (v) => v.toLocaleString('ko-KR') + '원'
                    },
                    grid: { color: '#3a3a3a' }
                }
            }
        }
    };

    return await chartRenderer.renderToBuffer(config);
}

// =====================
// 유저 활동시간(프레즌스) 유틸
// =====================

function kstDateString(date = new Date()) {
    return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
}

function normalizeStatus(status) {
    if (status === 'online' || status === 'idle' || status === 'dnd') return status;
    return 'offline';
}

// 현재 상태로 누적되던 시간을 history에 적립하고 새 상태로 전환
async function applyPresenceTransition(presenceDoc, newStatus, now = new Date()) {
    const oldStatus = normalizeStatus(presenceDoc.currentStatus);
    const since = presenceDoc.statusSince ? new Date(presenceDoc.statusSince) : now;
    const elapsedMs = Math.max(0, now - since);

    if (elapsedMs > 0) {
        const dateKey = kstDateString(now);
        let entry = presenceDoc.history.find(h => h.date === dateKey);
        if (!entry) {
            entry = { date: dateKey, online: 0, idle: 0, dnd: 0, offline: 0 };
            presenceDoc.history.push(entry);
        }
        entry[oldStatus] += elapsedMs;
    }

    presenceDoc.currentStatus = normalizeStatus(newStatus);
    presenceDoc.statusSince = now;

    // 7일치만 보관
    presenceDoc.history = presenceDoc.history.slice(-7);
    presenceDoc.markModified('history');
}

async function generatePresenceChart(presenceDoc, days = 3) {
    const now = new Date();
    const dateKeys = [];
    for (let i = days - 1; i >= 0; i--) {
        dateKeys.push(kstDateString(new Date(now.getTime() - i * 86400000)));
    }

    // history를 복사하고, 오늘 날짜는 진행중인 현재 상태 시간도 더해서 보여줌
    const historyMap = new Map((presenceDoc.history || []).map(h => [h.date, { ...h }]));
    const todayKey = kstDateString(now);
    const liveElapsedMs = Math.max(0, now - new Date(presenceDoc.statusSince));
    const liveStatus = normalizeStatus(presenceDoc.currentStatus);

    if (liveElapsedMs > 0) {
        const todayEntry = historyMap.get(todayKey) || { date: todayKey, online: 0, idle: 0, dnd: 0, offline: 0 };
        todayEntry[liveStatus] = (todayEntry[liveStatus] || 0) + liveElapsedMs;
        historyMap.set(todayKey, todayEntry);
    }

    const labels = dateKeys.map(d => d.slice(5)); // MM-DD
    const buckets = { online: [], idle: [], dnd: [], offline: [] };

    for (const key of dateKeys) {
        const entry = historyMap.get(key) || { online: 0, idle: 0, dnd: 0, offline: 0 };
        buckets.online.push(+(entry.online / 3600000).toFixed(2));
        buckets.idle.push(+(entry.idle / 3600000).toFixed(2));
        buckets.dnd.push(+(entry.dnd / 3600000).toFixed(2));
        buckets.offline.push(+(entry.offline / 3600000).toFixed(2));
    }

    const config = {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: '🟢 온라인', data: buckets.online, backgroundColor: '#57f287' },
                { label: '🌙 자리비움', data: buckets.idle, backgroundColor: '#fee75c' },
                { label: '⛔ 방해금지', data: buckets.dnd, backgroundColor: '#ed4245' },
                { label: '⚫ 오프라인', data: buckets.offline, backgroundColor: '#80848e' }
            ]
        },
        options: {
            animation: false,
            plugins: {
                legend: { labels: { color: '#ffffff', font: { size: 13 } } }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: { color: '#aaaaaa' },
                    grid: { color: '#3a3a3a' }
                },
                y: {
                    stacked: true,
                    ticks: {
                        color: '#aaaaaa',
                        callback: (v) => v + 'h'
                    },
                    grid: { color: '#3a3a3a' }
                }
            }
        }
    };

    return { buffer: await chartRenderer.renderToBuffer(config), buckets, labels };
}

const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

let aiPersonality = "너는 디스코드 봇이다. 반말로 짧게 답하되 과하지 않게 말한다.";

// 채널별 대화 기록 (최근 20턴 유지)
const aiChatHistory = new Map(); // channelId -> [{role, content}, ...]
const AI_HISTORY_LIMIT = 50; // user+assistant 합산 메시지 수

const Stock = mongoose.model('Stock', stockSchema);
const Money = mongoose.model('Money', moneySchema);

async function getUser(userId) {
    return await Money.findOneAndUpdate(
        { userId },
        { $setOnInsert: { userId, money: 1000 } },
        { returnDocument: 'after', upsert: true }
    );
}

const letterSchema = new mongoose.Schema({
    from: String,
    to: String,
    type: String,
    content: String,
    createdAt: { type: Date, default: Date.now }
});

const Letter = mongoose.model('Letter', letterSchema);

// ── 채팅 순위 ──
const chatCountSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    count: { type: Number, default: 0 }
});
const ChatCount = mongoose.model('ChatCount', chatCountSchema);

// ── 유저 활동시간(프레즌스) 기록 ──
const presenceSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    currentStatus: { type: String, default: 'offline' },
    statusSince: { type: Date, default: Date.now },
    history: {
        type: [{
            date: String, // YYYY-MM-DD (KST)
            online: { type: Number, default: 0 },
            idle: { type: Number, default: 0 },
            dnd: { type: Number, default: 0 },
            offline: { type: Number, default: 0 }
        }],
        default: []
    }
});
const Presence = mongoose.model('Presence', presenceSchema);

// ── 역할선택 풀 (관리자가 /역할설정 으로 등록한 역할들) ──
const selectableRoleSchema = new mongoose.Schema({
    roleId: { type: String, unique: true },
    roleName: String
});
const SelectableRole = mongoose.model('SelectableRole', selectableRoleSchema);

const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    REST,
    Routes,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder
} = require('discord.js');

const token = process.env.TOKEN;
const clientId = '1506507365560877156';
const guildId = '1172129810861015131';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ]
});

const newsPages = new Map();
const stockPages = new Map(); // 주식 목록 페이지네이션
const blackjackGames = new Map();
const tttGames = new Map();
const deletedMessages = new Map();

client.on('messageDelete', message => {
    if (message.author?.bot) return;
    deletedMessages.set(message.channel.id, {
        author: message.author.tag,
        content: message.content || '(내용 없음)',
        createdAt: new Date()
    });
});

const commands = [

    new SlashCommandBuilder()
        .setName('회사홍보')
        .setDescription('회사를 홍보합니다 (1시간 쿨타임, 10회 초과시 비용 2배)')
        .addStringOption(option =>
            option.setName('회사').setDescription('홍보할 회사').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('방법').setDescription('홍보 방식').setRequired(true)
                .addChoices(
                    { name: '📄 홍보용 전단지', value: 'flyer' },
                    { name: '📢 확성기 홍보', value: 'speaker' },
                    { name: '🪧 길거리 판넬', value: 'billboard' },
                    { name: '🌐 인터넷 광고', value: 'internet' },
                    { name: '📺 TV 프로그램 광고', value: 'tv' }
                )
        ),

    new SlashCommandBuilder()
        .setName('송금')
        .setDescription('다른 유저에게 돈을 송금합니다')
        .addUserOption(option =>
            option.setName('유저').setDescription('송금 받을 유저').setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('금액').setDescription('송금 금액').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('뉴스')
        .setDescription('다음 주식 변동 예측 뉴스를 확인합니다'),

    new SlashCommandBuilder()
        .setName('성격설정')
        .setDescription('AI 성격을 설정합니다')
        .addStringOption(option =>
            option.setName('프롬프트').setDescription('AI 성격 설명').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('ai설정')
        .setDescription('AI 채널 설정')
        .addChannelOption(option =>
            option.setName('채널').setDescription('AI가 대화할 채널').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('홀짝')
        .setDescription('홀짝 도박')
        .addStringOption(option =>
            option.setName('배팅').setDescription('배팅 금액 또는 올인').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('선택').setDescription('홀 또는 짝').setRequired(true)
                .addChoices(
                    { name: '홀', value: '홀' },
                    { name: '짝', value: '짝' }
                )
        ),

    new SlashCommandBuilder()
        .setName('슬롯')
        .setDescription('슬롯머신')
        .addStringOption(option =>
            option.setName('배팅').setDescription('배팅 금액 또는 올인').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('블랙잭')
        .setDescription('블랙잭 시작')
        .addStringOption(option =>
            option.setName('배팅').setDescription('배팅 금액 또는 올인').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('돈순위')
        .setDescription('플레이어 돈 순위를 확인합니다'),

    new SlashCommandBuilder()
        .setName('회사삭제')
        .setDescription('회사를 삭제합니다')
        .addStringOption(option =>
            option.setName('회사').setDescription('삭제할 회사 이름').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('주식')
        .setDescription('현재 상장된 회사 목록을 확인합니다.'),

    new SlashCommandBuilder()
        .setName('내주식')
        .setDescription('내가 보유한 주식 현황을 확인합니다.'),

    new SlashCommandBuilder()
        .setName('회사생성')
        .setDescription('주식 회사를 만듭니다')
        .addStringOption(option =>
            option.setName('이름').setDescription('회사 이름').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('매수')
        .setDescription('주식을 구매합니다 (1분 쿨타임)')
        .addStringOption(option =>
            option.setName('회사').setDescription('회사 이름').setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('수량').setDescription('구매 수량').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('매도')
        .setDescription('주식을 판매합니다 (수수료 1.5%)')
        .addStringOption(option =>
            option.setName('회사').setDescription('회사 이름').setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('수량').setDescription('판매 수량').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('시가총액')
        .setDescription('회사의 시가총액을 확인합니다')
        .addStringOption(option =>
            option.setName('회사').setDescription('회사 이름').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('차트')
        .setDescription('회사의 주가 차트를 확인합니다')
        .addStringOption(option =>
            option.setName('회사').setDescription('회사 이름').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('도움말')
        .setDescription('양봉이의 도움말을 확인합니다.'),

    new SlashCommandBuilder()
        .setName('안녕')
        .setDescription('양봉이에게 인사해보세요.'),

    new SlashCommandBuilder()
        .setName('주사위')
        .setDescription('주사위를 굴립니다'),

    new SlashCommandBuilder()
        .setName('운세')
        .setDescription('오늘의 운세를 알려줍니다'),

    new SlashCommandBuilder()
        .setName('청소')
        .setDescription('메시지를 삭제합니다')
        .addIntegerOption(option =>
            option.setName('개수').setDescription('삭제할 메시지 개수').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('삭제로그')
        .setDescription('최근 삭제된 메시지를 확인합니다'),

    new SlashCommandBuilder()
        .setName('유저정보')
        .setDescription('유저정보를 확인합니다')
        .addUserOption(option =>
            option.setName('유저').setDescription('정보를 볼 유저').setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName('틱택토')
        .setDescription('틱택토!!!!'),

    new SlashCommandBuilder()
        .setName('편지')
        .setDescription('유저에게 편지를 보냅니다')
        .addUserOption(option =>
            option.setName('유저').setDescription('받는 사람').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('종류').setDescription('편지 종류').setRequired(true)
                .addChoices(
                    { name: '우정의 편지', value: 'friend' },
                    { name: '러브레터', value: 'love' },
                    { name: '결투신청서', value: 'duel' }
                )
        )
        .addStringOption(option =>
            option.setName('내용').setDescription('편지 내용').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('편지함')
        .setDescription('받은 편지를 확인합니다'),

    new SlashCommandBuilder()
        .setName('돈')
        .setDescription('현재 돈을 확인합니다'),

    new SlashCommandBuilder()
        .setName('도박')
        .setDescription('인생은 한방!!!!')
        .addStringOption(option =>
            option.setName('금액').setDescription('배팅 금액 또는 올인').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('구걸')
        .setDescription('옛다 거지야'),

    new SlashCommandBuilder()
        .setName('지원금')
        .setDescription('현재 받을 수 있는 지원금을 조회합니다'),

    new SlashCommandBuilder()
        .setName('범죄')
        .setDescription('범죄를 저지릅니다')
        .addStringOption(option =>
            option.setName('종류').setDescription('범죄 종류를 선택합니다').setRequired(true)
                .addChoices(
                    { name: '💸 탈세 (10,000원 / 보유 100,000원 이상)', value: 'taxevasion' },
                    { name: '📈 주가조작 (1,000,000원)', value: 'stockmanip' },
                    { name: '📰 허위뉴스 (10,000,000원)', value: 'fakenews' }
                )
        )
        .addStringOption(option =>
            option.setName('회사').setDescription('대상 회사 (주가조작/허위뉴스에 필요)').setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName('대출')
        .setDescription('양봉장에게 돈을 빌립니다')
        .addStringOption(option =>
            option.setName('금액').setDescription('빌릴 금액').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('상환')
        .setDescription('양봉장에 빌린 돈을 갚습니다'),

    new SlashCommandBuilder()
        .setName('파산신청')
        .setDescription('마이너스 통장 상태에서 파산을 신청합니다. 보유 회사가 모두 삭제됩니다.'),

    new SlashCommandBuilder()
        .setName('유저활동시간')
        .setDescription('최근 3일간 유저의 온라인/자리비움/방해금지/오프라인 시간을 차트로 확인합니다')
        .addUserOption(option =>
            option.setName('유저').setDescription('조회할 유저').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('채팅순위')
        .setDescription('서버 채팅 개수 순위를 확인합니다'),

    new SlashCommandBuilder()
        .setName('마법의굼박고동님')
        .setDescription('고굼박님 이(가) 미소를지으며 온화한 목소리로 말씀하십니다. 그래 무엇이 고민이더냐')
        .addStringOption(option =>
            option.setName('질문').setDescription('질문이 무엇이냐').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('역할선택')
        .setDescription('역할을 쏙!쏙! 선택합니다. (있으면 제거, 없으면 부여)')
        .addRoleOption(option =>
            option.setName('역할').setDescription('선택할 역할').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('역할설정')
        .setDescription('[관리자] 역할선택에서 고를 수 있는 역할을 추가/제거합니다')
        .addRoleOption(option =>
            option.setName('역할').setDescription('역할 풀에 추가/제거할 역할').setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('초기화')
        .setDescription('[관리자] 모든 플레이어 자금과 회사를 초기화합니다'),

].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('슬래시 명령어 등록중...');
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
        console.log('슬래시 명령어 등록 완료!');
    } catch (error) {
        console.error(error);
    }
})();

client.once('clientReady', async () => {
    console.log(`${client.user.tag} 로그인 완료!`);

    // 활동시간 추적 초기화: 길드 멤버들의 현재 상태를 기준으로 시작
    try {
        const guild = await client.guilds.fetch(guildId);
        const members = await guild.members.fetch();

        for (const member of members.values()) {
            if (member.user.bot) continue;

            const status = normalizeStatus(member.presence?.status);
            const existing = await Presence.findOne({ userId: member.id });

            if (!existing) {
                await Presence.create({
                    userId: member.id,
                    currentStatus: status,
                    statusSince: new Date(),
                    history: []
                });
            }
        }

        console.log('[활동시간] 초기 프레즌스 동기화 완료');
    } catch (err) {
        console.error('[활동시간] 초기화 실패 (Presence Intent가 비활성화되어 있을 수 있습니다):', err.message);
    }
});

client.on('presenceUpdate', async (oldPresence, newPresence) => {
    try {
        if (!newPresence || !newPresence.userId) return;
        if (newPresence.guild?.id && newPresence.guild.id !== guildId) return;

        const member = newPresence.member;
        if (member?.user?.bot) return;

        const newStatus = normalizeStatus(newPresence.status);

        let presenceDoc = await Presence.findOne({ userId: newPresence.userId });
        if (!presenceDoc) {
            presenceDoc = new Presence({ userId: newPresence.userId, currentStatus: newStatus, statusSince: new Date(), history: [] });
            await presenceDoc.save();
            return;
        }

        if (normalizeStatus(presenceDoc.currentStatus) === newStatus) return;

        await applyPresenceTransition(presenceDoc, newStatus);
        await presenceDoc.save();
    } catch (err) {
        console.error('[활동시간] presenceUpdate 처리 오류:', err);
    }
});

function createBoard(gameId) {
    const game = tttGames.get(gameId);
    const rows = [];

    for (let i = 0; i < 3; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < 3; j++) {
            const index = i * 3 + j;
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`ttt_${gameId}_${index}`)
                    .setLabel(game.board[index] || '⬜')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!!game.board[index])
            );
        }
        rows.push(row);
    }

    return rows;
}

function getPriceMultiplier(price, isDepression) {
    let upMult = 1;
    let downMult = 1;

    if (price <= 100) {
        upMult = 4;
    } else if (price <= 500) {
        upMult = 3;
    } else if (price <= 800) {
        upMult = 2.2;
    } else if (price >= 10000) {
        upMult = 0.8;
        downMult = 1.5;
    }

    return { upMult, downMult };
}

// =========================
// setInterval - 주식 변동 (10분)
// =========================

setInterval(async () => {

    const stocks = await Stock.find({ deleted: { $ne: true } });

    let depressionEvent = await GameEvent.findOne({ type: 'depression' });

    if (depressionEvent && depressionEvent.active && depressionEvent.endsAt < new Date()) {
        depressionEvent.active = false;
        await depressionEvent.save();

        const allStocks = await Stock.find({ listed: true, deleted: { $ne: true } });
        for (const s of allStocks) {
            s.news.unshift('📈 대공황 종료!! 시장 안정화!!');
            s.news = s.news.slice(0, 5);
            await s.save();
        }

        if (aiChannelId) {
            try {
                const ch = await client.channels.fetch(aiChannelId);
                if (ch) await ch.send('📈 **대공황이 종료되었습니다!** 시장이 안정화됩니다.');
            } catch { }
        }

        console.log('[대공황] 종료');
    }

    const isCurrentlyActive = depressionEvent?.active && depressionEvent.endsAt > new Date();
    if (!isCurrentlyActive && Math.random() < 0.001) {
        const endsAt = new Date(Date.now() + 6 * 60 * 60 * 1000);

        if (!depressionEvent) {
            depressionEvent = await GameEvent.create({
                type: 'depression',
                active: true,
                startedAt: new Date(),
                endsAt
            });
        } else {
            depressionEvent.active = true;
            depressionEvent.startedAt = new Date();
            depressionEvent.endsAt = endsAt;
            await depressionEvent.save();
        }

        const allStocks = await Stock.find({ listed: true, deleted: { $ne: true } });
        for (const s of allStocks) {
            s.news.unshift('💀 대공황 발생!! 모든 주식 변동 증폭!!');
            s.news = s.news.slice(0, 5);
            await s.save();
        }

        if (aiChannelId) {
            try {
                const ch = await client.channels.fetch(aiChannelId);
                if (ch) await ch.send(
                    `💀 **⚠ 대공황 이벤트 자동 발동!!** ⚠\n\n⏰ 종료: <t:${Math.floor(endsAt.getTime() / 1000)}:R>\n\n효과:\n- 모든 주식 호재/악재 효과 1.5배\n- 주가 100원 이하: 상승률 4배\n- 주가 500원 이하: 상승률 2배\n- 주가 10,000원 이상: 상승률 0.8배, 하락률 1.5배`
                );
            } catch { }
        }

        console.log('[대공황] 0.1% 확률 자동 발동');
    }

    const freshEvent = await GameEvent.findOne({ type: 'depression' });
    const isDepression = freshEvent?.active && freshEvent.endsAt > new Date();

    const goodNews = [
        '하늘에서 내려온 토끼가 하는말 바니바니 대박대박!!',
        '고굼박 최고!!, 대박소식!!',
        '매출 폭등!',
        '꽁치그룹과의 협업!! 주가 상승!!',
        '주가 상승을 위한 박모씨의 섹시댄스!!! 효과는 대단했다!!',
        'ㅇㅇㅇ대표의 기부활동!! 마음이 따듯해진다!!',
        '박모씨가 버튜버활동을 시작했다!! 의외의 수요!!',
        '신제품 발표!!',
        '양봉장 왕 당첨!!',
        '부스트 후원!!! 레벨 업!!',
        '드리미가 홍보를 하기 시작했다!!',
        '유저들의 관심 급상승!!, 대표가 맛있고 회사가 친절해요!',
        '해외 진출 성공!!! 세상으로 뻗어나가는 기술력!!'
    ];

    const badNews = [
        '맛없는 사내식당.., 1인 시위 발발',
        '조폭 하모씨가 처들어왔다!! 비상!!',
        '꽁치그룹의 방해공작!!',
        '조모씨 감옥에 들어가다..',
        '박모씨의 퇴사소식!! 팬들 등돌리다..',
        '회장을 변기에 넣어버렸다..',
        '조영재가 회장직을 맡아버렸다..',
        '장민준이 회사 대표 가수로 취임해버렸다...',
        '대표 논란 발생!!, 직원 성추행, 음란한 대표,',
        '매출 폭락...',
        '산업스파이 등장!!! 급 떡락!!!',
        '대표에게 막말 논란.. 결국 못참은 대표, 분노의 오줌 갈기기'
    ];

    for (let stock of stocks) {

        if (!stock.listed) continue;

        if (stock.fakeNewsActive && stock.fakeNewsUntil && stock.fakeNewsUntil < new Date()) {
            stock.fakeNewsActive = false;
            stock.fakeNewsUntil = null;
            await stock.save();
        }

        let percent;

        const boomMessages = [
            '신제품!! 해승봇 mk2005 출시!!! 주식 개 미친 폭등!!!',
            '라이벌 꽁치그룹 파산!! 주식 개 미친 상승세!!!',
            '산하그룹 꽁치방 창설!!! 주식 개 미친 폭등!!!'
        ];

        const crashMessages = [
            '호달달달;; 상장폐지설 돌기 시작해.. 이대로 괜찮은가..',
            'ㅇㅇㅇ대표 직원에게 막말논란.. 불꽃패드립 작렬해..',
            'ㅇㅇㅇ대표 조폭 하모씨와의 친분과시 논란.. 이대로 진짜 괜찮은가',
        ];

        const hadPending = stock.pendingPercent !== null && stock.pendingPercent !== undefined;

        if (hadPending) {
            percent = stock.pendingPercent;

            if (Math.random() < 0.1) {
                percent = -percent;
            }

            if (stock.pendingType === 'boom') {
                const boom = boomMessages[Math.floor(Math.random() * boomMessages.length)];
                stock.news.unshift(`🚀 ${boom}`);
            } else if (stock.pendingType === 'crash') {
                const crash = crashMessages[Math.floor(Math.random() * crashMessages.length)];
                stock.news.unshift(`💀 ${crash}`);
            }

            stock.pendingPercent = null;
            stock.pendingNews = null;
            stock.pendingType = null;

        } else {

            const random = Math.random();
            const bearBoost = stock.bearMarket ? 0.15 : 0;

            if (random < 0.05) {
                percent = Math.random() * 0.5 + 0.3;
                const boom = boomMessages[Math.floor(Math.random() * boomMessages.length)];
                stock.news.unshift(`🚀 ${boom}`);
            } else if (random < 0.10 + bearBoost) {
                percent = -(Math.random() * 0.4 + 0.2);
                const crash = crashMessages[Math.floor(Math.random() * crashMessages.length)];
                stock.news.unshift(`💀 ${crash}`);
            } else {
                percent = (Math.random() * 72 - 36) / 100;

                if (stock.bearMarket) {
                    percent -= 0.05;
                }

                const promoBonus = Math.min(stock.promotionLevel * 0.03, 0.5);
                if (Math.random() < promoBonus) {
                    percent += Math.random() * (stock.promotionLevel * 0.005);
                }
            }
        }

        if (stock.fakeNewsActive) {
            percent = -percent;
        }

        const { upMult, downMult } = getPriceMultiplier(stock.price, isDepression);
        if (percent > 0) percent *= upMult;
        else percent *= downMult;

        let eventChance = Math.random();
        let badEventThreshold = 0.2;

        if (stock.price >= 1000000) {
            badEventThreshold = 0.8;
        }

        if (!stock.priceHistory) stock.priceHistory = [];
        if (!stock.priceHistoryTimes) stock.priceHistoryTimes = [];
        stock.priceHistory.push(stock.price);
        stock.priceHistoryTimes.push(new Date());
        if (stock.priceHistory.length > 30) {
            stock.priceHistory = stock.priceHistory.slice(-30);
            stock.priceHistoryTimes = stock.priceHistoryTimes.slice(-30);
        }
        stock.markModified('priceHistory');
        stock.markModified('priceHistoryTimes');

        let change = Math.floor(stock.price * percent);
        if (change === 0) change = Math.random() < 0.5 ? -1 : 1;

        const oldPrice = stock.price;
        stock.price += change;

        stock.lastChangedAt = new Date();
        stock.nextChangeAt = new Date(Date.now() + 600000);

        if (!hadPending) {
            if (eventChance < 0.1) {
                const news = goodNews[Math.floor(Math.random() * goodNews.length)];
                const bonus = Math.floor(stock.price * (Math.random() * 0.3 + 0.1) * upMult);
                stock.price += bonus;
                stock.news.unshift(`🟢 ${news} (+${bonus}원)`);
            } else if (eventChance < badEventThreshold) {
                const news = badNews[Math.floor(Math.random() * badNews.length)];
                const minus = Math.floor(stock.price * (Math.random() * 0.3 + 0.1) * downMult);
                stock.price -= minus;
                stock.news.unshift(`🔴 ${news} (-${minus}원)`);
            }
        }

        if (stock.price < 0) stock.price = 0;

        if (stock.price < oldPrice) {
            stock.downStreak += 1;
        } else {
            stock.downStreak = 0;
        }

        if (stock.downStreak >= 10) {
            stock.news.unshift(`⚠ ${stock.downStreak}연속 하락중!!`);
        }

        if (stock.downStreak >= 3 && stock.price >= 10000) {
            if (!stock.bearMarket) {
                stock.bearMarket = true;
                stock.bearMarketCount = 0;
                stock.news.unshift('📉 하락장 진입!! 악재 위험 증가!!');
            }
            stock.bearMarketCount += 1;
        } else if (stock.bearMarket && stock.downStreak === 0) {
            stock.bearMarketCount += 1;
            if (stock.bearMarketCount >= 2) {
                stock.bearMarket = false;
                stock.bearMarketCount = 0;
                stock.news.unshift('📈 하락장 탈출!!');
            }
        }

        if (stock.listed && (stock.price <= 5 || stock.downStreak >= 15)) {
            stock.listed = false;
            stock.price = 0;

            if (stock.downStreak >= 15) {
                stock.news.unshift('💀 15연속 하락으로 상장폐지');
            } else {
                stock.news.unshift('💀 주가 5원 이하로 상장폐지');
            }

            stock.bearMarket = false;
            stock.news = stock.news.slice(0, 5);

            if (stock.promotionLevel > 0) stock.promotionLevel -= 1;

            await stock.save();
            continue;
        }

        if (stock.owner && stock.listed) {
            const owner = await getUser(stock.owner);
            const fee = Math.floor(stock.price * 0.01);
            owner.money += fee;
            await owner.save();
        }

        stock.news = stock.news.slice(0, 5);
        await stock.save();
    }

}, 600000);

// =========================
// 세금 징수 - 하루 1회
// =========================
setInterval(async () => {

    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
    const users = await Money.find();

    for (const user of users) {

        if (user.lastTaxDate === today) continue;

        if (user.taxEvasionActive) {
            let simulatedTax = calcTax(user.money);
            user.taxEvasionSaved = (user.taxEvasionSaved || 0) + simulatedTax;
            user.lastTax = 0;
            user.lastTaxDate = today;
            await user.save();
            console.log(`[탈세] ${user.userId} 세금 ${formatMoney(simulatedTax)} 회피`);
            continue;
        }

        if (user.money < 14000) {
            user.lastTaxDate = today;
            await user.save();
            continue;
        }

        let tax = calcTax(user.money);

        user.money -= tax;
        if (user.money < 0) user.money = 0;

        user.lastTax = tax;
        user.lastTaxDate = today;

        await user.save();
        console.log(`[세금] ${user.userId} -${formatMoney(tax)}`);
    }

}, 60 * 60 * 1000);

function calcTax(m) {
    let tax = 0;

    if (m > 100000) {
        tax += Math.floor((m - 100000) * 0.0375);
        tax += Math.floor((100000 - 50000) * 0.035);
        tax += Math.floor((50000 - 30000) * 0.0333);
        tax += Math.floor((30000 - 15000) * 0.0318);
        tax += Math.floor((15000 - 8800) * 0.0293);
        tax += Math.floor((8800 - 5000) * 0.02);
        tax += Math.floor((5000 - 1400) * 0.0125);
        tax += Math.floor(1400 * 0.005);
    } else if (m > 50000) {
        tax += Math.floor((m - 50000) * 0.035);
        tax += Math.floor((50000 - 30000) * 0.0333);
        tax += Math.floor((30000 - 15000) * 0.0318);
        tax += Math.floor((15000 - 8800) * 0.0293);
        tax += Math.floor((8800 - 5000) * 0.02);
        tax += Math.floor((5000 - 1400) * 0.0125);
        tax += Math.floor(1400 * 0.005);
    } else if (m > 30000) {
        tax += Math.floor((m - 30000) * 0.0333);
        tax += Math.floor((30000 - 15000) * 0.0318);
        tax += Math.floor((15000 - 8800) * 0.0293);
        tax += Math.floor((8800 - 5000) * 0.02);
        tax += Math.floor((5000 - 1400) * 0.0125);
        tax += Math.floor(1400 * 0.005);
    } else if (m > 15000) {
        tax += Math.floor((m - 15000) * 0.0318);
        tax += Math.floor((15000 - 8800) * 0.0293);
        tax += Math.floor((8800 - 5000) * 0.02);
        tax += Math.floor((5000 - 1400) * 0.0125);
        tax += Math.floor(1400 * 0.005);
    } else if (m > 8800) {
        tax += Math.floor((m - 8800) * 0.0293);
        tax += Math.floor((8800 - 5000) * 0.02);
        tax += Math.floor((5000 - 1400) * 0.0125);
        tax += Math.floor(1400 * 0.005);
    } else if (m > 5000) {
        tax += Math.floor((m - 5000) * 0.02);
        tax += Math.floor((5000 - 1400) * 0.0125);
        tax += Math.floor(1400 * 0.005);
    } else if (m > 1400) {
        tax += Math.floor((m - 1400) * 0.0125);
        tax += Math.floor(1400 * 0.005);
    } else {
        tax += Math.floor(m * 0.005);
    }

    return tax;
}

// =========================
// 대출 만기 처리
// =========================
setInterval(async () => {
    const users = await Money.find({ loanAmount: { $gt: 0 } });
    for (const user of users) {
        if (!user.loanDueAt) continue;
        const now = new Date();
        if (now > user.loanDueAt) {
            const debt = user.loanAmount;
            const remainingAfterPay = user.money - debt;

            if (remainingAfterPay >= 0) {
                user.money = remainingAfterPay;
                user.loanAmount = 0;
                user.loanDueAt = null;
                await user.save();
                console.log(`[대출만기] ${user.userId} 자동 징수 완료`);
            } else {
                user.minusBalance = Math.abs(remainingAfterPay);
                user.money = 0;
                user.loanAmount = 0;
                user.loanDueAt = null;
                user.isBankrupt = true;

                const banDays = Math.floor(Math.random() * 3) + 1;
                user.bankruptBanUntil = new Date(Date.now() + banDays * 24 * 60 * 60 * 1000);

                await user.save();
                console.log(`[대출만기] ${user.userId} 마이너스 통장 발생! 빚: ${debt}원, 거래정지 ${banDays}일`);

                try {
                    const discordUser = await client.users.fetch(user.userId);
                    await discordUser.send(
                        `⚠️ **대출 만기 초과 알림**\n\n` +
                        `잔액 부족으로 대출금 ${formatMoney(debt)}을 상환하지 못했습니다.\n\n` +
                        `💸 **마이너스 통장** 발생! 빚: ${formatMoney(user.minusBalance)}\n` +
                        `🚫 거래 정지: ${banDays}일 (${user.bankruptBanUntil.toLocaleDateString('ko-KR')} 해제)\n\n` +
                        `📢 \`/파산신청\` 명령어로 파산을 신청하면 보유 회사가 모두 삭제되고 빚이 탕감됩니다.`
                    );
                } catch { }
            }
        }
    }
}, 60 * 60 * 1000);

// =========================
// 마이너스 통장 자동 해제 (10분마다 체크)
// =========================
setInterval(async () => {
    const bankruptUsers = await Money.find({ isBankrupt: true });
    for (const user of bankruptUsers) {
        // 거래정지 기간이 끝났고, 빚을 갚을 돈이 충분한 경우 자동 해제
        const banLifted = !user.bankruptBanUntil || user.bankruptBanUntil <= new Date();
        if (banLifted && user.money >= user.minusBalance) {
            const repaid = user.minusBalance;
            user.money -= repaid;
            user.minusBalance = 0;
            user.isBankrupt = false;
            user.bankruptBanUntil = null;
            await user.save();
            console.log(`[마이너스통장] ${user.userId} 잔액 충분으로 자동 해제 (빚 ${repaid}원 징수)`);

            try {
                const discordUser = await client.users.fetch(user.userId);
                await discordUser.send(
                    `✅ **마이너스 통장 자동 해제**\n\n` +
                    `보유 잔액으로 빚 ${formatMoney(repaid)}이 자동 상환되었습니다.\n` +
                    `💰 현재 잔액: ${formatMoney(user.money)}\n\n` +
                    `이제 정상적으로 거래할 수 있습니다!`
                );
            } catch { }
        }
    }
}, 10 * 60 * 1000);


// =========================
// interactionCreate
// =========================

client.on('interactionCreate', async interaction => {

    try {

        if (interaction.isButton()) {

            // ── 뉴스 페이지네이션 ──
            if (
                interaction.customId.startsWith('news_prev_') ||
                interaction.customId.startsWith('news_next_')
            ) {
                await interaction.deferUpdate();

                try {
                    const pageId = interaction.customId.split('_')[2];
                    const data = newsPages.get(pageId);

                    if (!data) {
                        return interaction.editReply({ content: '❌ 뉴스가 만료됨', components: [] });
                    }

                    if (interaction.user.id !== data.userId) {
                        return interaction.followUp({ content: '❌ 본인만 사용 가능', flags: 64 });
                    }

                    if (interaction.customId.startsWith('news_prev_')) {
                        data.page--;
                    } else {
                        data.page++;
                    }

                    if (data.page < 0) data.page = 0;
                    if (data.page >= data.pages.length) data.page = data.pages.length - 1;

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`news_prev_${pageId}`)
                            .setLabel('◀')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(data.page === 0),
                        new ButtonBuilder()
                            .setCustomId(`news_next_${pageId}`)
                            .setLabel('▶')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(data.page === data.pages.length - 1)
                    );

                    return interaction.editReply({
                        content: `🗞 주식 뉴스 (${data.page + 1}/${data.pages.length})\n\n` + data.pages[data.page],
                        components: [row]
                    });

                } catch (err) {
                    console.error(err);
                    return interaction.followUp({ content: '❌ 오류 발생', flags: 64 });
                }
            }

            // ── 주식 목록 페이지네이션 ──
            if (
                interaction.customId.startsWith('stock_prev_') ||
                interaction.customId.startsWith('stock_next_')
            ) {
                await interaction.deferUpdate();

                try {
                    const pageId = interaction.customId.split('_')[2];
                    const data = stockPages.get(pageId);

                    if (!data) {
                        return interaction.editReply({ content: '❌ 목록이 만료됐습니다. 다시 `/주식` 을 입력해주세요.', components: [] });
                    }

                    if (interaction.customId.startsWith('stock_prev_')) {
                        data.page = Math.max(0, data.page - 1);
                    } else {
                        data.page = Math.min(data.pages.length - 1, data.page + 1);
                    }

                    const totalPages = data.pages.length;
                    const page = data.page;

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`stock_prev_${pageId}`)
                            .setLabel('◀')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId(`stock_next_${pageId}`)
                            .setLabel('▶')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page >= totalPages - 1)
                    );

                    return interaction.editReply({
                        content: `🏢 상장 회사 목록 (${page + 1}/${totalPages}페이지)\n\`\`\`\n${data.pages[page]}\`\`\``,
                        components: [row]
                    });

                } catch (err) {
                    console.error(err);
                    return interaction.followUp({ content: '❌ 오류 발생', flags: 64 });
                }
            }

            // ── 블랙잭 ──
            if (
                interaction.customId === 'blackjack_hit' ||
                interaction.customId === 'blackjack_stand'
            ) {
                const game = blackjackGames.get(interaction.user.id);

                if (!game) {
                    return interaction.reply({ content: '게임 없음', flags: 64 });
                }

                const user = await getUser(interaction.user.id);
                const drawCard = () => Math.floor(Math.random() * 10) + 1;
                const playerTotal = () => game.playerCards.reduce((a, b) => a + b, 0);
                const dealerTotal = () => game.dealerCards.reduce((a, b) => a + b, 0);

                if (interaction.customId === 'blackjack_hit') {
                    game.playerCards.push(drawCard());

                    if (playerTotal() > 21) {
                        user.money -= game.bet;
                        await user.save();
                        blackjackGames.delete(interaction.user.id);

                        return interaction.update({
                            content: `💀 버스트!\n카드: ${game.playerCards.join(', ')}\n현재 돈: ${formatMoney(user.money)}`,
                            components: []
                        });
                    }

                    return interaction.update({
                        content: `🃏 카드: ${game.playerCards.join(', ')}\n합계: ${playerTotal()}`,
                        components: interaction.message.components
                    });
                }

                while (dealerTotal() < 17) {
                    game.dealerCards.push(drawCard());
                }

                let result;

                if (dealerTotal() > 21 || playerTotal() > dealerTotal()) {
                    user.money += game.bet;
                    result = '🎉 승리!';
                } else if (playerTotal() < dealerTotal()) {
                    user.money -= game.bet;
                    result = '💀 패배';
                } else {
                    result = '🤝 무승부';
                }

                await user.save();
                blackjackGames.delete(interaction.user.id);

                return interaction.update({
                    content: `${result}\n\n내 카드: ${game.playerCards.join(', ')} (${playerTotal()})\n딜러 카드: ${game.dealerCards.join(', ')} (${dealerTotal()})\n\n💰 현재 돈: ${formatMoney(user.money)}`,
                    components: []
                });
            }

            // ── 편지 열람 ──
            if (interaction.customId.startsWith('letter_')) {
                const id = interaction.customId.split('_')[1];
                const letter = await Letter.findById(id);

                if (!letter) {
                    return interaction.reply({ content: '편지를 찾을 수 없음', flags: 64 });
                }

                const fromUser = await client.users.fetch(letter.from);

                const typeEmoji = {
                    friend: '🤝 우정의 편지',
                    love: '💌 러브레터',
                    duel: '⚔ 결투신청서'
                };

                const embed = new EmbedBuilder()
                    .setTitle(typeEmoji[letter.type])
                    .setDescription(letter.content)
                    .addFields(
                        { name: '보낸 사람', value: fromUser.username },
                        { name: '날짜', value: `<t:${Math.floor(letter.createdAt / 1000)}:R>` }
                    )
                    .setColor(
                        letter.type === 'love' ? 'Red' : letter.type === 'duel' ? 'DarkRed' : 'Green'
                    );

                return interaction.reply({ embeds: [embed], flags: 64 });
            }

            // ── 편지함 페이지네이션 ──
            if (
                interaction.customId.startsWith('letters_prev_') ||
                interaction.customId.startsWith('letters_next_')
            ) {
                const perPage = 5;
                let page = Number(interaction.customId.split('_')[2]) || 0;
                const direction = interaction.customId.startsWith('letters_next_') ? 1 : -1;
                page = Math.max(0, page + direction);

                const allLetters = await Letter.find({ to: interaction.user.id }).sort({ createdAt: -1 });
                const start = page * perPage;
                const currentLetters = allLetters.slice(start, start + perPage);

                const buttons = currentLetters.map((l, index) =>
                    new ButtonBuilder()
                        .setCustomId(`letter_${l._id}`)
                        .setLabel(
                            `${l.type === 'love' ? '💌 러브' : l.type === 'duel' ? '⚔ 결투' : '🤝 우정'} #${start + index + 1}`
                        )
                        .setStyle(ButtonStyle.Primary)
                );

                const rows = [];
                if (buttons.length > 0) rows.push(new ActionRowBuilder().addComponents(buttons));

                rows.push(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`letters_prev_${page}`)
                            .setLabel('◀ 이전')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId(`letters_next_${page}`)
                            .setLabel('다음 ▶')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(start + perPage >= allLetters.length)
                    )
                );

                return interaction.update({ content: `📬 편지함 (${allLetters.length}개)`, components: rows });
            }

            // ── 편지 삭제 ──
            if (interaction.customId.startsWith('deleteletter_')) {
                const id = interaction.customId.split('_')[1];
                const letter = await Letter.findById(id);

                if (!letter) {
                    return interaction.reply({ content: '이미 삭제된 편지입니다.', flags: 64 });
                }

                await Letter.findByIdAndDelete(id);
                return interaction.update({ content: '🗑 편지가 삭제되었습니다.', embeds: [], components: [] });
            }

            // ── 틱택토 ──
            if (interaction.customId.startsWith('ttt_')) {
                const [, gameId, index] = interaction.customId.split('_');
                const game = tttGames.get(gameId);

                if (!game) return interaction.reply({ content: '게임이 종료됨', flags: 64 });
                if (game.board[index]) return interaction.reply({ content: '이미 선택된 칸임', flags: 64 });

                game.board[index] = game.turn;

                const winPatterns = [
                    [0,1,2],[3,4,5],[6,7,8],
                    [0,3,6],[1,4,7],[2,5,8],
                    [0,4,8],[2,4,6]
                ];

                const checkWin = (symbol) => winPatterns.some(p => p.every(i => game.board[i] === symbol));

                if (checkWin(game.turn)) {
                    tttGames.delete(gameId);
                    return interaction.update({ content: `🏆 ${game.turn} 승리!`, components: [] });
                }

                const isDraw = game.board.every(cell => cell !== null);
                if (isDraw) {
                    tttGames.delete(gameId);
                    return interaction.update({ content: `🤝 무승부!`, components: [] });
                }

                game.turn = game.turn === '❌' ? '⭕' : '❌';
                return interaction.update({ content: `현재 턴: ${game.turn}`, components: createBoard(gameId) });
            }

            return;
        }

        // ── 셀렉트 메뉴 ──
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId === 'help_menu') {
                const value = interaction.values[0];
                let embed;

                if (value === 'greet') {
                    embed = new EmbedBuilder()
                        .setTitle('👋 인삿말 도움말').setColor('Green')
                        .setDescription(`
\`/안녕\`
양봉이에게 인사합니다. 

\`/유저정보 유저:\`
유저 정보를 확인합니다!

\`/도움말\`
양봉이의 도움말을 확인합니다! 
`);
                }

                if (value === 'game') {
                    embed = new EmbedBuilder()
                        .setTitle('🎮 게임 도움말').setColor('Blue')
                        .setDescription(`
\`/틱택토\`
틱택토!!

\`/홀짝 배팅: 선택:\`
홀짝 도박을 합니다. 

\`/슬롯 배팅:\`
슬롯머신을 돌립니다. 

\`/블랙잭 배팅:\`
블랙잭을 시작합니다. 

\`/도박 금액:\`
돈을 걸고 도박합니다. 50%!! (10분 쿨타임)

\`/마법의굼박고동님 질문:\`
마법의 굼박고동님에게 질문을 던져보세요!
`);
                }

                if (value === 'economy') {
                    embed = new EmbedBuilder()
                        .setTitle('💰 경제 도움말').setColor('Gold')
                        .setDescription(`
\`/돈\`
현재 돈을 확인합니다!!

\`/돈순위\`
현재 돈 순위를 확인합니다!!

\`/구걸\`
10분마다 100~300원을 획득합니다!!

\`/운세\`
오늘의 운세를 확인합니다!! (출석체크!! 1000원 씩 획득!!)

\`/지원금\`
받을 수 있는 지원금을 조회합니다!! (3일마다 갱신)

\`/대출 금액:\`
양봉장에게 돈을 빌립니다!! (3일 상환, 이자 10%)

\`/상환\`
빌린 돈을 갚습니다!!

\`/파산신청\`
마이너스 통장 상태에서 파산 신청!! 회사 삭제 후 빚 탕감!!

\`/회사삭제 회사:\`
1000원으로 회사를 삭제합니다!!

\`/회사생성 이름:\`
1000원으로 회사를 생성합니다!! (최대 2개)

\`/매수 회사: 수량:\`
주식을 구입합니다!! (1분 쿨타임)

\`/매도 회사: 수량:\`
주식을 판매합니다!! (수수료 1.5%)

\`/시가총액 회사:\`
회사 시가총액을 확인합니다!!

\`/차트 회사:\`
회사 주가 차트를 확인합니다!!

\`/뉴스\`
주식 변동률을 미리 확인합니다.

\`/주식\`
상장된 회사 목록 확인

\`/내주식\`
내 보유 주식 & 수익 확인
`);
                }

                if (value === 'crime') {
                    embed = new EmbedBuilder()
                        .setTitle('🔫 범죄 도움말').setColor('DarkRed')
                        .setDescription(`
\`/범죄 종류:\`
범죄를 저지릅니다. 종류 선택:

💸 **탈세** - 10,000원 / 보유 100,000원 이상 필요
세금 납부 1회 면제. 들킬 시 탈세 누적액 3배 징수.

📈 **주가조작** - 1,000,000원
대상 회사 다음 변동 강제 상승. 들킬 시 거래 24시간 제한.

📰 **허위뉴스** - 10,000,000원
대상 회사 뉴스 방향 반전 3시간. 들킬 시 3천만원 추가 차감 + 회사 거래 3시간 제한.

⚠ 들킬 위험도는 세 범죄가 공유합니다.
`);
                }

                if (value === 'letter') {
                    embed = new EmbedBuilder()
                        .setTitle('📨 편지 도움말').setColor('Red')
                        .setDescription(`
\`/편지\`
유저에게 편지 보내기

\`/편지함\`
받은 편지 확인
`);
                }

                if (value === 'role') {
                    embed = new EmbedBuilder()
                        .setTitle('🎭 역할 도움말').setColor('Purple')
                        .setDescription(`
\`/역할선택 역할:\`
선택 가능한 역할을 토글합니다 (있으면 제거, 없으면 부여)

\`/역할설정 역할:\`
[관리자] 역할선택에서 고를 수 있는 역할 풀에 추가/제거합니다
`);
                }

                if (value === 'manage') {
                    embed = new EmbedBuilder()
                        .setTitle('🛠 관리 도움말').setColor('Red')
                        .setDescription(`
\`/청소\`
메시지 삭제

\`/ai설정 채널:\`
ai대화 채널을 설정합니다.

\`/성격설정 프롬프트:\`
ai의 성격혹은 말투, 등 을 설정합니다.

\`/삭제로그\`
삭제 메시지 확인

\`/유저활동시간 유저:\`
최근 3일간 유저의 온라인/자리비움/방해금지/오프라인 시간을 차트로 확인합니다.

\`/채팅순위\`
서버 채팅 개수 순위를 확인합니다.

\`/초기화\`
[관리자] 전체 초기화

💀 **대공황**은 10분마다 0.1% 확률로 자동 발동되는 희귀 이벤트입니다!
`);
                }

                return interaction.update({ embeds: [embed], components: [] });
            }
        }

    } catch (error) {
        console.error(error);
        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: '❌ 오류 발생' });
            } else {
                await interaction.reply({ content: '❌ 오류 발생', flags: 64 });
            }
        } catch (e) {
            console.error(e);
        }
    }

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === '안녕') {
        return interaction.reply('인사 똑바로해라.');
    }

    if (interaction.commandName === '주사위') {
        const dice = Math.floor(Math.random() * 6) + 1;
        await interaction.reply(`🎲 금나와라 뚝딱!! : ${dice}`);
    }

    if (interaction.commandName === '운세') {
        await interaction.deferReply({ flags: 64 });

        const userId = interaction.user.id;
        const user = await getUser(userId);

        const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

        if (user.lastFortuneDate === today) {
            const now = new Date();
            const tomorrow = new Date();
            tomorrow.setHours(24, 0, 0, 0);
            const diff = tomorrow - now;
            const hours = Math.floor(diff / 1000 / 60 / 60);
            const minutes = Math.floor((diff / 1000 / 60) % 60);

            return interaction.editReply(
                `❌ 하루에 한번만 가능!\n⏰ 남은 시간: ${hours}시간 ${minutes}분`
            );
        }

        if (user.lastFortuneDate === yesterday) {
            user.fortuneStreak += 1;
        } else {
            user.fortuneStreak = 1;
        }

        user.lastFortuneDate = today;

        let reward = 1000;
        if (user.fortuneStreak >= 3) reward += 500;
        if (user.fortuneStreak >= 7) reward += 1500;
        if (user.fortuneStreak >= 14) reward += 3000;

        user.money += reward;
        await user.save();

        const fortunes = [
            '🍀 오늘의 당신은 럭키가이!',
            '🔥 타올라라 열정이여!, 성공의 기분',
            '💰 금전운 급 상승~!',
            '💤 푹 쉬어라...',
            '💻 오늘은 게임을 해도 될 것 같아~!',
            '📙 공부나 해라..',
            '⚡ 길가다 벼락맞을 확률 120%',
            '💚 연애운 급 상승~!'
        ];

        const random = fortunes[Math.floor(Math.random() * fortunes.length)];

        return interaction.editReply(
            `🔮 ${interaction.user.username}님의 오늘 운세\n\n${random}\n\n🔥 연속 출석: ${user.fortuneStreak}일\n💰 보상: +${reward}원`
        );
    }

    if (interaction.commandName === '도움말') {
        const embed = new EmbedBuilder()
            .setTitle('🐝 양봉이')
            .setDescription('안녕 날 소개하지 난 양봉장의 전용 봇 양봉이라고 하오\n\n아래 카테고리에서 명령어 확인')
            .setColor('Green')
            .setThumbnail('https://cdn.discordapp.com/attachments/1110460136373366845/1506536312423841873/image.png')
            .setFooter({ text: '양봉장의 전용 봇, 아이스크림을 좋아한다. ' });

        const menu = new StringSelectMenuBuilder()
            .setCustomId('help_menu')
            .setPlaceholder('카테고리 선택')
            .addOptions(
                { label: '👋 인삿말', description: '기본 인삿말 명령어', value: 'greet' },
                { label: '🎮 게임', description: '게임 명령어', value: 'game' },
                { label: '💰 경제', description: '돈/주식 명령어', value: 'economy' },
                { label: '🔫 범죄', description: '범죄 명령어', value: 'crime' },
                { label: '📨 편지', description: '편지 기능', value: 'letter' },
                { label: '🎭 역할', description: '역할 선택 기능', value: 'role' },
                { label: '🛠 관리', description: '관리 명령어', value: 'manage' }
            );

        const row = new ActionRowBuilder().addComponents(menu);
        return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (interaction.commandName === '삭제로그') {
        const data = deletedMessages.get(interaction.channel.id);

        if (!data) {
            return interaction.reply({ content: '❌ 최근 삭제된 메시지가 없다!', flags: 64 });
        }

        const embed = new EmbedBuilder()
            .setTitle('🗑 최근 삭제된 메시지')
            .addFields(
                { name: '작성자', value: data.author },
                { name: '내용', value: data.content }
            )
            .setColor('Red');

        await interaction.reply({ embeds: [embed] });
    }

    if (interaction.commandName === '유저정보') {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('유저') || interaction.user;
        const user = await client.users.fetch(targetUser.id);

        let member = null;
        try {
            member = await interaction.guild.members.fetch(targetUser.id);
        } catch {
            member = null;
        }

        const fullUser = await user.fetch();
        const roles = member?.roles.cache
            .filter(r => r.id !== interaction.guild.id)
            .map(r => `<@&${r.id}>`)
            .join(' ') || '없음';

        const embed = new EmbedBuilder()
            .setTitle('👤 유저 정보')
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setImage(fullUser.bannerURL({ size: 1024 }) || null)
            .setColor('Blue')
            .addFields(
                { name: '유저 닉네임', value: member?.nickname || user.username, inline: true },
                { name: '유저 ID', value: user.id, inline: true },
                { name: '디스코드 가입일', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '서버 가입일', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : '서버 없음', inline: true },
                { name: '서버 역할', value: roles }
            );

        return interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === '틱택토') {
        await interaction.deferReply();

        const gameId = interaction.id;
        tttGames.set(gameId, { board: Array(9).fill(null), turn: '❌' });

        return interaction.editReply({
            content: '🎮 틱택토 시작! ❌ 먼저',
            components: createBoard(gameId)
        });
    }

    if (interaction.commandName === '편지') {
        const to = interaction.options.getUser('유저');
        const type = interaction.options.getString('종류');
        const content = interaction.options.getString('내용');

        await Letter.create({ from: interaction.user.id, to: to.id, type, content });

        await interaction.reply({ content: `📨 편지를 보냈습니다! (${to.username})`, flags: 64 });

        try {
            await to.send(`📬 새로운 편지가 도착했습니다! 양봉장에서 **/편지함** 으로 확인하세요.`);
        } catch { }
    }

    if (interaction.commandName === '편지함') {
        const perPage = 5;
        const page = 0;

        const allLetters = await Letter.find({ to: interaction.user.id }).sort({ createdAt: -1 });

        if (allLetters.length === 0) {
            return interaction.reply({ content: '📭 받은 편지가 없습니다.', flags: 64 });
        }

        const start = page * perPage;
        const currentLetters = allLetters.slice(start, start + perPage);

        const buttons = currentLetters.map((l, index) =>
            new ButtonBuilder()
                .setCustomId(`letter_${l._id}`)
                .setLabel(`${l.type === 'love' ? '💌 러브' : l.type === 'duel' ? '⚔ 결투' : '🤝 우정'} #${start + index + 1}`)
                .setStyle(ButtonStyle.Primary)
        );

        const rows = [];
        if (buttons.length > 0) rows.push(new ActionRowBuilder().addComponents(buttons));

        rows.push(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`letters_prev_${page}`)
                    .setLabel('◀ 이전')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId(`letters_next_${page}`)
                    .setLabel('다음 ▶')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(allLetters.length <= perPage)
            )
        );

        await interaction.reply({ content: `📬 편지함 (${allLetters.length}개)`, components: rows, flags: 64 });
    }

    if (interaction.commandName === '돈') {
        const user = await getUser(interaction.user.id);

        const taxMsg = user.lastTax > 0
            ? ` (마지막 세금: -${formatMoney(user.lastTax)})`
            : '';

        const loanMsg = user.loanAmount > 0
            ? `\n💸 대출 잔액: ${formatMoney(user.loanAmount)} (만기: <t:${Math.floor(user.loanDueAt.getTime() / 1000)}:R>)`
            : '';

        const bankruptMsg = user.isBankrupt
            ? `\n🚨 마이너스 통장! 빚: ${formatMoney(user.minusBalance)}\n🚫 거래 정지: <t:${Math.floor(user.bankruptBanUntil.getTime() / 1000)}:R> 해제\n📢 \`/파산신청\` 으로 파산 신청 가능`
            : '';

        return interaction.reply({
            content: `💰 현재 돈: ${formatMoney(user.money)}${taxMsg}${loanMsg}${bankruptMsg}`,
            flags: 64
        });
    }

    if (interaction.commandName === '도박') {
        const userId = interaction.user.id;
        const amountInput = interaction.options.getString('금액');
        const user = await getUser(userId);

        if (user.lastGambleTime) {
            const diff = Date.now() - new Date(user.lastGambleTime).getTime();
            const cooldown = 10 * 60 * 1000;

            if (diff < cooldown) {
                const remain = cooldown - diff;
                const minutes = Math.floor(remain / 1000 / 60);
                const seconds = Math.floor((remain / 1000) % 60);
                return interaction.reply({
                    content: `❌ 도박 쿨타임!\n⏰ 남은 시간: ${minutes}분 ${seconds}초`,
                    flags: 64
                });
            }
        }

        let bet;
        if (amountInput === '올인' || amountInput === 'allin') {
            bet = user.money;
        } else {
            bet = parseInt(amountInput);
        }

        if (bet <= 0) return interaction.reply({ content: '❌ 1원 이상 걸어라.', flags: 64 });
        if (user.money < bet) return interaction.reply({ content: '❌ 돈 부족', flags: 64 });

        const win = Math.random() < 0.5;
        if (win) { user.money += bet; } else { user.money -= bet; }

        user.lastGambleTime = new Date();
        await user.save();

        return interaction.reply(
            `${win ? '🎉 승리!' : '💀 패배...'}\n${win ? '+' : '-'}${formatMoney(bet)}\n현재 돈: ${formatMoney(user.money)}`
        );
    }

    if (interaction.commandName === '회사생성') {
        await interaction.deferReply();

        const name = interaction.options.getString('이름');
        const exists = await Stock.findOne({ name });

        if (exists) {
            if (exists.deleted) return interaction.editReply('❌ 삭제된 회사 이름은 다시 사용할 수 없습니다.');
            return interaction.editReply('이미 존재하는 회사입니다.');
        }

        const user = await getUser(interaction.user.id);
        const createCost = 1000;

        if (user.money < createCost) {
            return interaction.editReply(`❌ 회사 생성 비용 부족 (${createCost}원 필요)`);
        }

        const myCompanies = await Stock.countDocuments({
            owner: interaction.user.id,
            deleted: { $ne: true },
            listed: true
        });

        if (myCompanies >= 2) {
            return interaction.editReply('❌ 회사는 최대 2개까지 생성 가능');
        }

        user.money -= createCost;
        user.recentCompanyCreatedAt = new Date();
        user.companyBoostUsed = false;

        await user.save();

        await Stock.create({
            name,
            owner: interaction.user.id,
            price: 1000,
            totalShares: 0,
            news: [],
            priceHistory: [],
            priceHistoryTimes: []
        });

        return interaction.editReply(`🏢 ${name} 회사 생성 완료!\n💸 생성 비용: ${formatMoney(createCost)}`);
    }

    if (interaction.commandName === '매수') {
        await interaction.deferReply();

        const name = interaction.options.getString('회사');
        const qty = interaction.options.getInteger('수량');

        if (qty > 200) {
            return interaction.editReply('❌ 한번에 최대 200주까지만 매수 가능합니다.');
        }

        if (qty <= 0) return interaction.editReply('❌ 1주 이상 매수 가능');

        const stock = await Stock.findOne({ name, listed: true });
        if (!stock) return interaction.editReply('❌ 회사 없음');

        if (stock.tradeBanUntil && stock.tradeBanUntil > new Date()) {
            const remain = stock.tradeBanUntil - new Date();
            const hours = Math.floor(remain / 1000 / 60 / 60);
            const minutes = Math.floor((remain / 1000 / 60) % 60);
            return interaction.editReply(`❌ 거래 제한 중!\n⏰ 해제까지: ${hours}시간 ${minutes}분`);
        }

        const user = await getUser(interaction.user.id);

        if (user.isBankrupt && user.bankruptBanUntil && user.bankruptBanUntil > new Date()) {
            const remain = user.bankruptBanUntil - new Date();
            const days = Math.floor(remain / 1000 / 60 / 60 / 24);
            const hours = Math.floor((remain / 1000 / 60 / 60) % 24);
            return interaction.editReply(`❌ 마이너스 통장으로 거래 정지 중!\n⏰ 해제까지: ${days}일 ${hours}시간\n📢 \`/파산신청\` 으로 파산을 신청할 수 있습니다.`);
        }

        if (user.stockManipUntil && user.stockManipUntil > new Date()) {
            const remain = user.stockManipUntil - new Date();
            const hours = Math.floor(remain / 1000 / 60 / 60);
            const minutes = Math.floor((remain / 1000 / 60) % 60);
            return interaction.editReply(`❌ 주가조작 들킴으로 거래 제한!\n⏰ 해제까지: ${hours}시간 ${minutes}분`);
        }

        const lastBuy = user.buyCooldowns instanceof Map
            ? user.buyCooldowns.get(name)
            : user.buyCooldowns?.[name];

        if (lastBuy) {
            const diff = Date.now() - new Date(lastBuy).getTime();
            const cooldown = 1 * 60 * 1000;

            if (diff < cooldown) {
                const remain = cooldown - diff;
                const seconds = Math.floor(remain / 1000);

                return interaction.editReply(
                    `❌ 매수 쿨타임!\n⏰ 남은 시간: ${seconds}초`
                );
            }
        }

        const totalCost = stock.price * qty;

        if (user.money < totalCost) {
            return interaction.editReply(
                `❌ 돈 부족\n필요 금액: ${formatMoney(totalCost)}`
            );
        }

        user.money -= totalCost;

        if (!user.stockAvgPrice) user.stockAvgPrice = new Map();
        const prevQty = user.stocks.get(name) || 0;
        const prevAvg = user.stockAvgPrice.get(name) || 0;
        const newQty = prevQty + qty;
        const newAvg = prevQty > 0
            ? Math.floor((prevAvg * prevQty + stock.price * qty) / newQty)
            : stock.price;

        user.stocks.set(name, newQty);
        user.stockAvgPrice.set(name, newAvg);
        user.markModified('stockAvgPrice');

        if (!user.buyCooldowns) user.buyCooldowns = new Map();
        user.buyCooldowns.set(name, new Date());
        user.markModified('buyCooldowns');

        await user.save();

        stock.totalShares = (stock.totalShares || 0) + qty;

        const buyBoost = Math.min(qty * 0.001, 0.15);
        if (!stock.pendingPercent) {
            stock.pendingPercent = buyBoost;
            stock.pendingType = null;
            stock.pendingNews = null;
        }

        stock.news = stock.news.slice(0, 5);
        await stock.save();

        return interaction.editReply(
            `📈 ${name} ${qty}주 매수 완료!\n` +
            `💰 총 지불: ${formatMoney(totalCost)}\n` +
            `📊 평균 매입단가: ${formatMoney(newAvg)}`
        );
    }

    if (interaction.commandName === '매도') {
        await interaction.deferReply();

        const name = interaction.options.getString('회사');
        const qty = interaction.options.getInteger('수량');

        if (qty <= 0) return interaction.editReply('❌ 1주 이상 매도 가능');

        const stock = await Stock.findOne({ name, listed: true });
        if (!stock) return interaction.editReply('❌ 회사 없음');

        if (stock.tradeBanUntil && stock.tradeBanUntil > new Date()) {
            const remain = stock.tradeBanUntil - new Date();
            const hours = Math.floor(remain / 1000 / 60 / 60);
            const minutes = Math.floor((remain / 1000 / 60) % 60);
            return interaction.editReply(`❌ 거래 제한 중!\n⏰ 해제까지: ${hours}시간 ${minutes}분`);
        }

        const user = await getUser(interaction.user.id);

        if (user.isBankrupt && user.bankruptBanUntil && user.bankruptBanUntil > new Date()) {
            const remain = user.bankruptBanUntil - new Date();
            const days = Math.floor(remain / 1000 / 60 / 60 / 24);
            const hours = Math.floor((remain / 1000 / 60 / 60) % 24);
            return interaction.editReply(`❌ 마이너스 통장으로 거래 정지 중!\n⏰ 해제까지: ${days}일 ${hours}시간\n📢 \`/파산신청\` 으로 파산을 신청할 수 있습니다.`);
        }

        if (user.stockManipUntil && user.stockManipUntil > new Date()) {
            const remain = user.stockManipUntil - new Date();
            const hours = Math.floor(remain / 1000 / 60 / 60);
            const minutes = Math.floor((remain / 1000 / 60) % 60);
            return interaction.editReply(`❌ 주가조작 들킴으로 거래 제한!\n⏰ 해제까지: ${hours}시간 ${minutes}분`);
        }

        const owned = user.stocks.get(name) || 0;

        if (owned < qty) return interaction.editReply('❌ 주식이 부족합니다.');

        const rawRevenue = stock.price * qty;
        const fee = Math.floor(rawRevenue * 0.015);
        const netRevenue = rawRevenue - fee;

        if (!user.stockAvgPrice) user.stockAvgPrice = new Map();
        const avgPrice = user.stockAvgPrice.get(name) || 0;
        const profit = (stock.price - avgPrice) * qty - fee;
        const profitSign = profit >= 0 ? '+' : '';
        const profitEmoji = profit >= 0 ? '📈' : '📉';

        user.stocks.set(name, owned - qty);
        user.money += netRevenue;

        if (owned - qty === 0) {
            user.stockAvgPrice.set(name, 0);
            user.markModified('stockAvgPrice');
        }

        await user.save();

        stock.totalShares = Math.max(0, (stock.totalShares || 0) - qty);

        const sellDrop = Math.min(qty * 0.001, 0.15);
        if (!stock.pendingPercent) {
            stock.pendingPercent = -sellDrop;
            stock.pendingType = null;
            stock.pendingNews = null;
        }

        let crashMsg = '';

        if (qty >= 100) {
            const crashChance = Math.min(qty / 100 * 0.05, 0.5);

            if (Math.random() < crashChance) {
                const crashPercent = Math.random() * 0.2 + 0.1;
                const crashAmount = Math.floor(stock.price * crashPercent);
                stock.price = Math.max(0, stock.price - crashAmount);
                stock.news.unshift(`💀 대주주 대량매도!! 주가 폭락!! (-${formatMoney(crashAmount)})`);
                crashMsg = `\n⚠ 대량 매도로 주가 폭락 발생!`;
            }
        }

        stock.news = stock.news.slice(0, 5);
        await stock.save();

        return interaction.editReply(
            `💰 ${name} ${qty}주 매도 완료!\n` +
            `💸 수수료: ${formatMoney(fee)}\n` +
            `💵 실수령: ${formatMoney(netRevenue)}\n` +
            `${profitEmoji} 실현 수익: ${profitSign}${formatMoney(profit)}` +
            crashMsg
        );
    }

    if (interaction.commandName === '시가총액') {
        await interaction.deferReply();

        const name = interaction.options.getString('회사');
        const stock = await Stock.findOne({ name, deleted: { $ne: true } });

        if (!stock) return interaction.editReply('❌ 회사 없음');

        const marketCap = stock.price * (stock.totalShares || 0);

        let ownerName = '알 수 없음';
        try {
            const ownerUser = await client.users.fetch(stock.owner);
            ownerName = ownerUser.username;
        } catch { }

        const statusEmoji = stock.listed ? '🟢 상장중' : '🔴 상장폐지';
        const bearEmoji = stock.bearMarket ? '📉 하락장' : '📈 정상';

        const tradeBanMsg = (stock.tradeBanUntil && stock.tradeBanUntil > new Date())
            ? `\n🚫 거래제한: <t:${Math.floor(stock.tradeBanUntil.getTime() / 1000)}:R> 해제`
            : '';

        const fakeNewsMsg = stock.fakeNewsActive ? '\n⚠ 허위뉴스 활성화 중!' : '';

        const embed = new EmbedBuilder()
            .setTitle(`🏢 ${stock.name}`)
            .setColor(stock.listed ? 'Green' : 'Red')
            .addFields(
                { name: '💰 현재 주가', value: formatMoney(stock.price), inline: true },
                { name: '📊 총 발행 주식', value: `${(stock.totalShares || 0).toLocaleString()}주`, inline: true },
                { name: '🏦 시가총액', value: formatMoney(marketCap), inline: true },
                { name: '📈 상태', value: statusEmoji + tradeBanMsg + fakeNewsMsg, inline: true },
                { name: '🌡 시장 상황', value: bearEmoji, inline: true },
                { name: '👔 대표', value: ownerName, inline: true },
                { name: '📉 연속 하락', value: `${stock.downStreak}연속`, inline: true },
                { name: '🔥 홍보력', value: `${stock.promotionLevel}`, inline: true }
            );

        if (stock.news && stock.news.length > 0) {
            embed.addFields({ name: '📰 최근 소식', value: stock.news.slice(0, 3).join('\n') });
        }

        return interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === '차트') {
        await interaction.deferReply();

        const name = interaction.options.getString('회사');
        const stock = await Stock.findOne({ name, deleted: { $ne: true } });

        if (!stock) return interaction.editReply('❌ 회사 없음');

        const history = stock.priceHistory || [];

        if (history.length < 2) {
            return interaction.editReply('❌ 아직 차트 데이터가 부족합니다. 최소 2번 이상 변동이 있어야 합니다. (10분마다 갱신)');
        }

        try {
            const chartBuffer = await generateStockChart(stock);
            const attachment = new AttachmentBuilder(chartBuffer, { name: `${name}_chart.png` });

            const firstPrice = history[0];
            const currentPrice = stock.price;
            const change = currentPrice - firstPrice;
            const changePercent = ((change / firstPrice) * 100).toFixed(2);
            const isUp = change >= 0;

            const embed = new EmbedBuilder()
                .setTitle(`📊 ${name} 주가 차트`)
                .setColor(isUp ? 0x57f287 : 0xed4245)
                .addFields(
                    { name: '💰 현재 주가', value: formatMoney(currentPrice), inline: true },
                    { name: `${isUp ? '📈' : '📉'} 변동`, value: `${isUp ? '+' : ''}${formatMoney(change)} (${isUp ? '+' : ''}${changePercent}%)`, inline: true },
                    { name: '📋 기록 수', value: `${history.length}개 (최근 ${history.length * 10}분)`, inline: true }
                )
                .setImage(`attachment://${name}_chart.png`)
                .setFooter({ text: '10분마다 자동 갱신' });

            return interaction.editReply({ embeds: [embed], files: [attachment] });

        } catch (err) {
            console.error(err);
            return interaction.editReply('❌ 차트 생성 오류');
        }
    }

    // =========================
    // /주식 - 페이지네이션 (8개씩)
    // =========================
    if (interaction.commandName === '주식') {
        await interaction.deferReply();

        const stocks = await Stock.find({ deleted: { $ne: true }, listed: true });

        if (stocks.length === 0) return interaction.editReply('현재 상장된 회사가 없습니다.');

        const PER_PAGE = 8;

        const buildPageText = async (pageStocks) => {
            let table =
                padKo('회사명', 18) +
                padKo('가격', 14) +
                padKo('다음변동', 20) +
                '대표\n' +
                '─'.repeat(62) + '\n';

            for (const s of pageStocks) {
                let nextStr = '알 수 없음';
                if (s.nextChangeAt) {
                    const diffMs = s.nextChangeAt - new Date();
                    if (diffMs > 0) {
                        const diffMin = Math.floor(diffMs / 1000 / 60);
                        const diffSec = Math.floor((diffMs / 1000) % 60);
                        nextStr = `${diffMin}분 ${diffSec}초 후`;
                    } else {
                        nextStr = '곧 변동';
                    }
                }

                let ownerName = '?';
                try {
                    const ownerUser = await client.users.fetch(s.owner);
                    ownerName = ownerUser.username;
                } catch { }

                const bearMark = s.bearMarket ? ' 📉' : '';

                table +=
                    padKo(s.name, 18) +
                    padKo(`${s.price.toLocaleString('ko-KR')}원`, 14) +
                    padKo(nextStr, 20) +
                    ownerName + bearMark + '\n';

                if (s.news && s.news.length > 0) {
                    table += `  📰 ${s.news[0]}\n`;
                }

                table += '─'.repeat(62) + '\n';
            }

            return table;
        };

        const totalPages = Math.ceil(stocks.length / PER_PAGE);
        const pages = [];
        for (let i = 0; i < totalPages; i++) {
            const slice = stocks.slice(i * PER_PAGE, (i + 1) * PER_PAGE);
            pages.push(await buildPageText(slice));
        }

        const pageId = interaction.id;
        stockPages.set(pageId, { pages, page: 0 });
        setTimeout(() => stockPages.delete(pageId), 10 * 60 * 1000);

        const buildRow = (page) => new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`stock_prev_${pageId}`)
                .setLabel('◀')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId(`stock_next_${pageId}`)
                .setLabel('▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= totalPages - 1)
        );

        return interaction.editReply({
            content: `🏢 상장 회사 목록 (1/${totalPages}페이지 · 전체 ${stocks.length}개)\n\`\`\`\n${pages[0]}\`\`\``,
            components: totalPages > 1 ? [buildRow(0)] : []
        });
    }

    if (interaction.commandName === '내주식') {
        await interaction.deferReply({ flags: 64 });

        const user = await getUser(interaction.user.id);
        if (!user.stockAvgPrice) user.stockAvgPrice = new Map();

        let myStockTable =
            padKo('회사명', 16) +
            padKo('수량', 8) +
            padKo('매입단가', 16) +
            padKo('현재가', 16) +
            '평가손익\n' +
            '─'.repeat(68) + '\n';

        let hasStock = false;
        let totalProfit = 0;

        for (const [name, qty] of user.stocks) {
            if (qty <= 0) continue;

            hasStock = true;

            const stock = await Stock.findOne({ name });
            const avgPrice = user.stockAvgPrice.get(name) || 0;
            const currentPrice = stock?.price || 0;
            const profit = (currentPrice - avgPrice) * qty;
            const profitSign = profit >= 0 ? '+' : '';
            const profitEmoji = profit >= 0 ? '▲' : '▼';

            totalProfit += profit;

            let displayName = name;
            if (stock && (!stock.listed || stock.deleted)) {
                displayName = `[폐지]${name}`;
            }

            myStockTable +=
                padKo(displayName, 16) +
                padKo(qty + '주', 8) +
                padKo(avgPrice.toLocaleString('ko-KR') + '원', 16) +
                padKo(currentPrice.toLocaleString('ko-KR') + '원', 16) +
                `${profitEmoji}${profitSign}${profit.toLocaleString('ko-KR')}원\n`;
        }

        if (!hasStock) {
            myStockTable += '보유 주식 없음\n';
        } else {
            myStockTable += '─'.repeat(68) + '\n';
            const totalSign = totalProfit >= 0 ? '+' : '';
            const totalEmoji = totalProfit >= 0 ? '▲' : '▼';
            myStockTable +=
                padKo('총 평가손익', 58) +
                `${totalEmoji}${totalSign}${totalProfit.toLocaleString('ko-KR')}원\n`;
        }

        return interaction.editReply({
            content:
`📈 ${interaction.user.username}님의 주식 현황

\`\`\`
${myStockTable}
\`\`\``
        });
    }

    if (interaction.commandName === '뉴스') {
        await interaction.deferReply();

        const stocks = await Stock.find({ listed: true, deleted: { $ne: true } });

        if (stocks.length === 0) return interaction.editReply('상장된 회사 없음');

        const goodPreview = [
            'ㅇㅇㅇ대표 선행 밝혀져.. "그저 도움이 되고 싶었다" ',
            '꽁치기업과의 협업 루머.. 드디어 큰 거 오나..',
            '매출 상승 기대.. ㅇㅇㅇ대표 입가에 큰 미소',
            '박모씨의 사원 인터뷰.. 긍정적 평가..',
            '드리미 홍보 담당으로 채택.. 사원평가 긍정적..',
            '유저 평가 상승세.. ㅇㅇ기업의 긍정적 효과..'
        ];

        const badPreview = [
            'ㅇㅇ기업 사내식당 직원 대거 퇴사..',
            '조폭 하모씨.. ㅇㅇ기업을 눈여겨보고있다.. 논란..',
            '사원 박ㅇㅇ씨의 개인 인터뷰.. 불만 증가',
            '장민준 회사 대표 가수로 취업해.. 사원들의 불만 증가',
            '조모씨가 회장직을 맡아.. 루머',
            '이ㅇㅇ 사원 충격고백!! 회장을 변기에...',
        ];

        const boomPreview = [
            '초대형 투자 유치 예정!!!.. 떡상의 기회',
            '꽁치기업과의 협업!!.. ㅇㅇ기업 빛을보다..',
            '꽁치기업 주가 폭락... 라이벌 그룹 ㅇㅇ기업 폭등의 기회!!..',
        ];

        const crashPreview = [
            '상장폐지 설 돌아... 과연 루머인가.. ',
            'ㅇㅇ기업 사원 장ㅇㅇ 씨 "대표가 저에게 막말을 했어요.." 곧 밝혀질것',
            'ㅇㅇ대표 조폭 하모씨와의 만남.. 둘의 친분 루머..',
        ];

        const pages = [];

        for (const stock of stocks) {
            let type, news, chance, percent;

            if (stock.pendingPercent !== null && stock.pendingPercent !== undefined && stock.pendingNews) {
                percent = stock.pendingPercent;
                news = stock.pendingNews;

                if (stock.pendingType === 'boom') {
                    type = '🚀 폭등 가능성';
                    chance = '5%';
                } else if (stock.pendingType === 'crash') {
                    type = '💀 폭락 가능성';
                    chance = '5%';
                } else if (percent >= 0) {
                    type = '📈 상승 예상';
                    chance = '45%';
                } else {
                    type = '📉 하락 예상';
                    chance = '45%';
                }

            } else {
                const random = Math.random();

                if (random < 0.05) {
                    type = '🚀 폭등 가능성';
                    chance = '5%';
                    news = boomPreview[Math.floor(Math.random() * boomPreview.length)];
                    percent = Math.random() * 0.5 + 0.3;
                    stock.pendingType = 'boom';
                } else if (random < 0.10) {
                    type = '💀 폭락 가능성';
                    chance = '5%';
                    news = crashPreview[Math.floor(Math.random() * crashPreview.length)];
                    percent = -(Math.random() * 0.4 + 0.2);
                    stock.pendingType = 'crash';
                } else if (random < 0.55) {
                    type = '📈 상승 예상';
                    chance = '45%';
                    news = goodPreview[Math.floor(Math.random() * goodPreview.length)];
                    percent = Math.random() * 0.2;
                    stock.pendingType = null;
                } else {
                    type = '📉 하락 예상';
                    chance = '45%';
                    news = badPreview[Math.floor(Math.random() * badPreview.length)];
                    percent = -(Math.random() * 0.2);
                    stock.pendingType = null;
                }

                stock.pendingNews = news;
                stock.pendingPercent = percent;
                await stock.save();
            }

            const lastTime = stock.lastChangedAt
                ? `<t:${Math.floor(stock.lastChangedAt.getTime() / 1000)}:R>`
                : '없음';

            const nextTime = stock.nextChangeAt
                ? `<t:${Math.floor(stock.nextChangeAt.getTime() / 1000)}:R>`
                : '없음';

            const bearWarning = stock.bearMarket ? '\n⚠ 현재 하락장!!' : '';
            const fakeWarning = stock.fakeNewsActive ? '\n🕵 허위뉴스 활성화 중 (뉴스 방향 반전!)' : '';
            const tradeBanWarning = (stock.tradeBanUntil && stock.tradeBanUntil > new Date())
                ? `\n🚫 거래제한 중!!` : '';

            pages.push(
`🏢 ${stock.name}

💰 현재 가격: ${formatMoney(stock.price)}
🏦 시가총액: ${formatMoney(stock.price * (stock.totalShares || 0))}

📊 예상 변동:
${type}${bearWarning}${fakeWarning}${tradeBanWarning}

🎲 적중 확률: 90%
📈 변동 확률: ${chance}

📰 뉴스:
${news}

⏰ 최근 변동:
${lastTime}

🕒 다음 변동:
${nextTime}`
            );
        }

        const pageId = interaction.id;
        newsPages.set(pageId, { userId: interaction.user.id, pages, page: 0 });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`news_prev_${pageId}`)
                .setLabel('◀')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(`news_next_${pageId}`)
                .setLabel('▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(pages.length <= 1)
        );

        return interaction.editReply({
            content: `🗞 주식 뉴스 (1/${pages.length})\n\n` + pages[0],
            components: [row]
        });
    }

    if (interaction.commandName === '구걸') {
        await interaction.deferReply({ flags: 64 });

        const user = await getUser(interaction.user.id);
        const now = Date.now();

        if (user.lastBegTime) {
            const diff = now - new Date(user.lastBegTime).getTime();
            const cooldown = 10 * 60 * 1000;

            if (diff < cooldown) {
                const remain = cooldown - diff;
                const minutes = Math.floor(remain / 1000 / 60);
                const seconds = Math.floor((remain / 1000) % 60);

                return interaction.editReply(
                    `❌ 아직 구걸 못함!\n⏰ 남은 시간: ${minutes}분 ${seconds}초`
                );
            }
        }

        const reward = Math.floor(Math.random() * 201) + 100;
        user.money += reward;
        user.lastBegTime = new Date();
        await user.save();

        return interaction.editReply(`🪙 ${reward}원을 구걸했다!\n💰 현재 돈: ${formatMoney(user.money)}`);
    }

    if (interaction.commandName === '돈순위') {
        await interaction.deferReply();

        const users = await Money.find().sort({ money: -1 }).limit(10);

        let text =
            padKo('순위', 6) +
            padKo('돈', 16) +
            padKo('지난세금', 16) +
            '유저\n' +
            '─'.repeat(52) + '\n';

        for (let i = 0; i < users.length; i++) {
            let username = '알 수 없음';
            try {
                const discordUser = await client.users.fetch(users[i].userId);
                username = discordUser.username;
            } catch { }

            const taxStr = users[i].lastTax > 0
                ? `(-${users[i].lastTax.toLocaleString('ko-KR')})`
                : '';

            const bankruptMark = users[i].isBankrupt ? ' 💸' : '';

            text +=
                padKo(String(i + 1), 6) +
                padKo(users[i].money.toLocaleString('ko-KR') + '원', 16) +
                padKo(taxStr, 16) +
                username + bankruptMark + '\n';
        }

        return interaction.editReply({
            content:
`💰 플레이어 돈 순위

\`\`\`
${text}
\`\`\``
        });
    }

    if (interaction.commandName === '회사삭제') {
        await interaction.deferReply();

        const name = interaction.options.getString('회사');
        const stock = await Stock.findOne({ name });
        const { PermissionsBitField } = require('discord.js');

        if (!stock) return interaction.editReply('❌ 회사 없음');
        if (
            stock.owner !== interaction.user.id &&
            !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)
        ) {
            return interaction.editReply('❌ 자기 회사 또는 서버 관리자만 삭제 가능');
        }
        const user = await getUser(interaction.user.id);

        if (!user.deleteCost) user.deleteCost = 1000;

        if (user.money < user.deleteCost) {
            return interaction.editReply(`❌ 회사 삭제 비용 부족\n현재 비용: ${formatMoney(user.deleteCost)}`);
        }

        user.money -= user.deleteCost;
        const currentCost = user.deleteCost;
        user.deleteCost += 1000;
        await user.save();

        stock.deleted = true;
        stock.deletedAt = new Date();
        stock.listed = false;
        stock.price = 0;
        stock.news.unshift('💀 회사 삭제됨');
        await stock.save();

        return interaction.editReply(
            `🗑 ${name} 회사 삭제 완료!\n💸 삭제 비용: ${formatMoney(currentCost)}\n📈 다음 삭제 비용: ${formatMoney(user.deleteCost)}`
        );
    }

    if (interaction.commandName === '홀짝') {
        const user = await getUser(interaction.user.id);
        const input = interaction.options.getString('배팅');
        const choice = interaction.options.getString('선택');

        let bet;
        if (input === '올인') { bet = user.money; } else { bet = parseInt(input); }

        if (!bet || bet <= 0) return interaction.reply('❌ 배팅 오류');
        if (user.money < bet) return interaction.reply('❌ 돈 부족');

        const num = Math.floor(Math.random() * 10) + 1;
        const result = num % 2 === 0 ? '짝' : '홀';
        const win = choice === result;

        if (win) { user.money += bet; } else { user.money -= bet; }
        await user.save();

        return interaction.reply(
            `🎲 숫자: ${num}\n${win ? '🎉 승리!' : '💀 패배'}\n현재 돈: ${formatMoney(user.money)}`
        );
    }

    if (interaction.commandName === '슬롯') {
        const user = await getUser(interaction.user.id);
        const input = interaction.options.getString('배팅');

        let bet;
        if (input === '올인' || input === 'allin') { bet = user.money; } else { bet = parseInt(input); }

        if (!bet || bet <= 0) return interaction.reply('❌ 배팅 오류');
        if (user.money < bet) return interaction.reply('❌ 돈 부족');

        const icons = ['🍒', '🍋', '💎', '💀', '🍀'];
        const roll = [
            icons[Math.floor(Math.random() * icons.length)],
            icons[Math.floor(Math.random() * icons.length)],
            icons[Math.floor(Math.random() * icons.length)]
        ];

        let reward = 0;

        if (roll[0] === roll[1] && roll[1] === roll[2]) {
            if (roll[0] === '💎') { reward = bet * 10; }
            else if (roll[0] === '💀') { reward = -Math.floor(user.money / 2); }
            else { reward = bet * 3; }
        } else {
            reward = -bet;
        }

        user.money += reward;
        if (user.money < 0) user.money = 0;
        await user.save();

        return interaction.reply(
            `🎰 ${roll.join(' | ')}\n\n${reward >= 0 ? `🎉 +${formatMoney(reward)}` : `💀 ${formatMoney(reward)}`}\n💰 현재 돈: ${formatMoney(user.money)}`
        );
    }

    if (interaction.commandName === '블랙잭') {
        const user = await getUser(interaction.user.id);
        const input = interaction.options.getString('배팅');

        let bet;
        if (input === '올인' || input === 'allin') { bet = user.money; } else { bet = parseInt(input); }

        if (!bet || bet <= 0) return interaction.reply('❌ 배팅 오류');
        if (user.money < bet) return interaction.reply('❌ 돈 부족');

        const drawCard = () => Math.floor(Math.random() * 10) + 1;
        const playerCards = [drawCard(), drawCard()];
        const dealerCards = [drawCard(), drawCard()];

        blackjackGames.set(interaction.user.id, { bet, playerCards, dealerCards });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('blackjack_hit').setLabel('🃏 더 뽑기').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('blackjack_stand').setLabel('✋ 멈추기').setStyle(ButtonStyle.Secondary)
        );

        return interaction.reply({
            content: `🃏 블랙잭 시작!\n\n내 카드: ${playerCards.join(', ')}\n합계: ${playerCards.reduce((a, b) => a + b, 0)}`,
            components: [row]
        });
    }

    if (interaction.commandName === '청소') {
        if (!interaction.member.permissions.has('ManageMessages')) {
            return interaction.reply({ content: '❌ 메시지 관리 권한이 없습니다.', flags: 64 });
        }

        const amount = interaction.options.getInteger('개수');

        if (amount < 1 || amount > 100) {
            return interaction.reply({ content: '❌ 1~100개만 삭제 가능', flags: 64 });
        }

        try {
            await interaction.channel.bulkDelete(amount, true);
            return interaction.reply({ content: `🧹 ${amount}개 메시지 삭제 완료`, flags: 64 });
        } catch (err) {
            console.error(err);
            return interaction.reply({ content: '❌ 삭제 실패', flags: 64 });
        }
    }

    if (interaction.commandName === 'ai설정') {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ 관리자만 사용 가능', flags: 64 });
        }

        const channel = interaction.options.getChannel('채널');
        aiChannelId = channel.id;
        aiChatHistory.clear();

        return interaction.reply({ content: `🤖 AI 채널 설정 완료!\n채널: ${channel}`, flags: 64 });
    }

    if (interaction.commandName === '성격설정') {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ 관리자만 사용 가능', flags: 64 });
        }

        aiPersonality = interaction.options.getString('프롬프트');
        // 성격 바뀌면 기존 대화 기록 초기화
        aiChatHistory.clear();
        return interaction.reply({ content: `🤖 AI 성격 변경 완료! (대화 기록 초기화됨)\n\n${aiPersonality}`, flags: 64 });
    }

    if (interaction.commandName === '송금') {
        await interaction.deferReply();

        const target = interaction.options.getUser('유저');
        const amount = interaction.options.getInteger('금액');

        if (target.id === interaction.user.id) return interaction.editReply('❌ 자기 자신에게는 송금 불가');
        if (target.bot) return interaction.editReply('❌ 봇에게는 송금 불가');
        if (amount <= 0) return interaction.editReply('❌ 1원 이상 송금 가능');

        const sender = await getUser(interaction.user.id);

        if (sender.money < amount) {
            return interaction.editReply(`❌ 돈 부족\n현재 돈: ${formatMoney(sender.money)}`);
        }

        const receiver = await getUser(target.id);
        sender.money -= amount;
        receiver.money += amount;

        await sender.save();
        await receiver.save();

        return interaction.editReply(
            `💸 송금 완료!\n\n보낸 사람: ${interaction.user.username}\n받는 사람: ${target.username}\n송금 금액: ${formatMoney(amount)}\n\n💰 현재 돈: ${formatMoney(sender.money)}`
        );
    }

    if (interaction.commandName === '회사홍보') {
        await interaction.deferReply();

        const name = interaction.options.getString('회사');
        const method = interaction.options.getString('방법');

        const stock = await Stock.findOne({ name, deleted: { $ne: true }, listed: true });

        if (!stock) return interaction.editReply('❌ 회사 없음');
        if (stock.owner !== interaction.user.id) return interaction.editReply('❌ 자기 회사만 홍보 가능');

        if (stock.lastPromoAt) {
            const diff = Date.now() - new Date(stock.lastPromoAt).getTime();
            const cooldown = 60 * 60 * 1000;
            if (diff < cooldown) {
                const remain = cooldown - diff;
                const minutes = Math.floor(remain / 1000 / 60);
                const seconds = Math.floor((remain / 1000) % 60);
                return interaction.editReply(`❌ 홍보 쿨타임!\n⏰ 남은 시간: ${minutes}분 ${seconds}초`);
            }
        }

        const user = await getUser(interaction.user.id);

        let baseCost = 0;
        let promoAdd = 0;
        let news = '';

        switch (method) {
            case 'flyer':
                baseCost = 10000;
                promoAdd = 1;
                news = '📄 홍보용 전단지 배포!!, 우리회사좀 봐주세요!! 제발요!!!';
                break;
            case 'speaker':
                baseCost = 30000;
                promoAdd = 5;
                news = '📢 확성기 홍보!!, 아- 아- 왔어요 왔어요, 계란이 왔어요';
                break;
            case 'billboard':
                baseCost = 50000;
                promoAdd = 10;
                news = '🪧 길거리 판넬 설치!!!, 이거 불법건축물 아니여??';
                break;
            case 'internet':
                baseCost = 500000;
                promoAdd = 20;
                news = '🌐 인터넷 광고 시작!!, 이 회사!! 대표가 맛있고 회사가 친절해요!!';
                break;
            case 'tv':
                baseCost = 1000000;
                promoAdd = 50;
                news = '📺 TV 프로그램 광고 시작!!, 보아라 세상아!! 나의 잘남을!!';
                break;
        }

        const promoCount = stock.promoCount || 0;
        const costMultiplier = promoCount >= 10 ? 2 : 1;
        const cost = baseCost * costMultiplier;

        if (user.money < cost) {
            return interaction.editReply(`❌ 돈 부족\n필요 금액: ${formatMoney(cost)}${costMultiplier === 2 ? ' (10회 초과로 2배)' : ''}`);
        }

        user.money -= cost;
        await user.save();

        stock.promotionLevel = Math.min(100, (stock.promotionLevel || 0) + promoAdd);
        stock.promoCount = promoCount + 1;
        stock.lastPromoAt = new Date();

        stock.news.unshift(`🟢 ${news}\n📈 홍보력 +${promoAdd}`);
        stock.news = stock.news.slice(0, 5);

        await stock.save();

        const doubleMsg = costMultiplier === 2 ? '\n⚠ 10회 초과 비용 2배 적용' : '';

        return interaction.editReply(
            `📢 ${name} 홍보 완료!\n\n💸 사용 금액: ${formatMoney(cost)}${doubleMsg}\n🔥 현재 홍보력: ${stock.promotionLevel}\n📊 홍보 횟수: ${stock.promoCount}회`
        );
    }

    if (interaction.commandName === '지원금') {
        await interaction.deferReply({ flags: 64 });

        const userId = interaction.user.id;
        const user = await getUser(userId);

        const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

        let canReceive = true;
        let cooldownMsg = '';

        if (user.lastSubsidyDate) {
            const lastDate = new Date(user.lastSubsidyDate);
            const nowDate = new Date();
            const diffDays = Math.floor((nowDate - lastDate) / (1000 * 60 * 60 * 24));

            if (diffDays < 3) {
                canReceive = false;
                const remainDays = 3 - diffDays;
                cooldownMsg = `\n❌ 지원금은 3일마다 수령 가능합니다.\n⏰ 남은 시간: 약 ${remainDays}일`;
            }
        }

        let availableList = '📋 **수령 가능한 지원금 목록**\n\n';

        const isLowFunds = user.money <= 10000;
        availableList += `${isLowFunds ? '✅' : '❌'} **저자금 지원금** - 80,000원\n  조건: 현재 자금 10,000원 이하 (현재: ${formatMoney(user.money)})\n\n`;

        let recentCompany = false;
        if (user.recentCompanyCreatedAt && !user.companyBoostUsed) {
            const diff = Date.now() - new Date(user.recentCompanyCreatedAt).getTime();
            recentCompany = diff < 20 * 60 * 1000;
        }
        availableList += `${recentCompany ? '✅' : '❌'} **창업 지원금** - 30,000원 + 회사 홍보력 +15 부스트 (1회)\n  조건: 20분 이내 회사 창설 & 미사용\n\n`;

        const gogumAvailable = !user.gogumSubsidyUsed;
        availableList += `${gogumAvailable ? '✅' : '❌'} **고굼박 최고 지원금** - 50,000원 (1회 한정)\n  조건: 미수령\n\n`;

        if (!canReceive) {
            return interaction.editReply(availableList + cooldownMsg);
        }

        let totalReward = 0;
        let rewardMsg = '💰 **지급된 지원금:**\n';
        let stockBoostMsg = '';

        if (isLowFunds) {
            totalReward += 80000;
            rewardMsg += '- 저자금 지원금: +50,000원\n';
        }

        if (recentCompany) {
            totalReward += 30000;
            rewardMsg += '- 창업 지원금: +10,000원\n';

            const myStock = await Stock.findOne({
                owner: userId,
                deleted: { $ne: true },
                listed: true
            }).sort({ _id: -1 });

            if (myStock) {
                myStock.promotionLevel = Math.min(100, (myStock.promotionLevel || 0) + 15);
                await myStock.save();
                stockBoostMsg = `\n📈 ${myStock.name} 홍보력 +15 부스트 적용!`;
            }

            user.companyBoostUsed = true;
        }

        if (gogumAvailable) {
            totalReward += 50000;
            rewardMsg += '- 고굼박 최고 지원금: +50,000원\n';
            user.gogumSubsidyUsed = true;
        }

        if (totalReward === 0) {
            return interaction.editReply(availableList + '\n❌ 현재 수령 가능한 지원금이 없습니다.');
        }

        user.money += totalReward;
        user.lastSubsidyDate = today;
        await user.save();

        return interaction.editReply(
            availableList +
            `\n${rewardMsg}\n` +
            `💵 총 지급액: ${formatMoney(totalReward)}\n` +
            `💰 현재 잔액: ${formatMoney(user.money)}` +
            stockBoostMsg
        );
    }

    if (interaction.commandName === '범죄') {
        await interaction.deferReply({ flags: 64 });

        const crimeType = interaction.options.getString('종류');
        const targetName = interaction.options.getString('회사');
        const user = await getUser(interaction.user.id);
        const risk = user.crimeRisk || 0;

        if (crimeType === 'taxevasion') {
            if (user.money < 100000) {
                return interaction.editReply('❌ 탈세는 보유 자금 100,000원 이상일 때만 가능합니다.');
            }
            if (user.money < 10000) {
                return interaction.editReply('❌ 탈세 비용 10,000원이 부족합니다.');
            }
            if (user.taxEvasionActive) {
                return interaction.editReply('❌ 이미 탈세 중입니다. 다음 세금 징수 후 다시 시도하세요.');
            }

            if (Math.random() * 100 < risk) {
                const savedTax = user.taxEvasionSaved || 0;
                const penalty = calcTax(user.money) + savedTax * 3;

                user.money = Math.max(0, user.money - penalty);
                user.crimeRisk = Math.min(100, risk + 10);
                user.taxEvasionSaved = 0;
                user.crimeCount = (user.crimeCount || 0) + 1;
                await user.save();

                const myStocks = await Stock.find({ owner: interaction.user.id, listed: true, deleted: { $ne: true } });
                for (const s of myStocks) {
                    s.news.unshift(`🔴 ${interaction.user.username} 대표 탈세의혹.. 조사버리겠다 선언`);
                    s.news = s.news.slice(0, 5);
                    await s.save();
                }

                return interaction.editReply(
                    `🚨 탈세가 들켰습니다!!\n\n💸 페널티: -${formatMoney(penalty)}\n📊 현재 위험도: ${user.crimeRisk}%\n💰 현재 잔액: ${formatMoney(user.money)}`
                );
            }

            user.money -= 10000;
            user.taxEvasionActive = true;
            user.crimeRisk = Math.min(100, risk + 10);
            user.crimeCount = (user.crimeCount || 0) + 1;
            await user.save();

            return interaction.editReply(
                `✅ 탈세 성공!\n\n💸 비용: -10,000원\n🎭 다음 세금 징수 1회 면제\n📊 현재 위험도: ${user.crimeRisk}%`
            );
        }

        if (crimeType === 'stockmanip') {
            if (!targetName) {
                return interaction.editReply('❌ 주가조작에는 회사 이름이 필요합니다.');
            }
            if (user.money < 1000000) {
                return interaction.editReply('❌ 주가조작 비용 1,000,000원이 부족합니다.');
            }

            const stock = await Stock.findOne({ name: targetName, listed: true, deleted: { $ne: true } });
            if (!stock) return interaction.editReply('❌ 상장된 회사 없음');

            user.money -= 1000000;
            user.crimeRisk = Math.min(100, risk + 35);
            user.crimeCount = (user.crimeCount || 0) + 1;

            if (Math.random() * 100 < risk) {
                user.stockManipUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
                await user.save();

                return interaction.editReply(
                    `🚨 주가조작이 들켰습니다!!\n\n🚫 거래 제한: 24시간\n📊 현재 위험도: ${user.crimeRisk}%`
                );
            }

            stock.pendingPercent = Math.random() * 0.3 + 0.2;
            stock.pendingType = 'boom';
            stock.pendingNews = `🌐 ${targetName} 기업 호재 소식!! 상승 기대!!`;
            await stock.save();
            await user.save();

            return interaction.editReply(
                `✅ 주가조작 성공!\n\n📈 ${targetName} 다음 변동 강제 상승 예약\n📊 현재 위험도: ${user.crimeRisk}%`
            );
        }

        if (crimeType === 'fakenews') {
            if (!targetName) {
                return interaction.editReply('❌ 허위뉴스에는 회사 이름이 필요합니다.');
            }
            if (user.money < 10000000) {
                return interaction.editReply('❌ 허위뉴스 비용 10,000,000원이 부족합니다.');
            }

            const stock = await Stock.findOne({ name: targetName, listed: true, deleted: { $ne: true } });
            if (!stock) return interaction.editReply('❌ 상장된 회사 없음');

            user.money -= 10000000;
            user.crimeRisk = Math.min(100, risk + 30);
            user.crimeCount = (user.crimeCount || 0) + 1;

            if (Math.random() * 100 < risk) {
                user.money = Math.max(0, user.money - 30000000);
                await user.save();

                stock.tradeBanUntil = new Date(Date.now() + 3 * 60 * 60 * 1000);
                stock.news.unshift(`🔴 ${interaction.user.username} 대표 허위뉴스 발행.. 이대로 괜찮..냐?`);
                stock.news = stock.news.slice(0, 5);
                await stock.save();

                return interaction.editReply(
                    `🚨 허위뉴스 살포가 들켰습니다!!\n\n💸 추가 페널티: -30,000,000원\n🚫 ${targetName} 거래 3시간 제한\n📊 현재 위험도: ${user.crimeRisk}%\n💰 현재 잔액: ${formatMoney(user.money)}`
                );
            }

            stock.fakeNewsActive = true;
            stock.fakeNewsUntil = new Date(Date.now() + 3 * 60 * 60 * 1000);
            stock.news.unshift(`📰 ${targetName} 허위 뉴스 살포 중.. 주가 방향 반전!!`);
            stock.news = stock.news.slice(0, 5);
            await stock.save();
            await user.save();

            return interaction.editReply(
                `✅ 허위뉴스 살포 성공!\n\n📰 ${targetName} 주가 변동 방향 3시간 반전\n📊 현재 위험도: ${user.crimeRisk}%`
            );
        }
    }

    if (interaction.commandName === '대출') {
        await interaction.deferReply({ flags: 64 });

        const user = await getUser(interaction.user.id);
        const input = interaction.options.getString('금액');

        if (user.loanAmount > 0) {
            return interaction.editReply(`❌ 이미 대출 중입니다.\n잔액: ${formatMoney(user.loanAmount)}\n만기: <t:${Math.floor(user.loanDueAt.getTime() / 1000)}:R>\n\`/상환\` 으로 갚아주세요.`);
        }

        if (user.isBankrupt) {
            return interaction.editReply(`❌ 마이너스 통장 상태에서는 추가 대출이 불가능합니다.\n📢 \`/파산신청\` 으로 파산을 신청하세요.`);
        }

        let amount = parseInt(input);
        if (isNaN(amount) || amount <= 0) return interaction.editReply('❌ 올바른 금액을 입력해주세요.');
        if (amount > 500000) return interaction.editReply('❌ 최대 대출 한도는 500,000원입니다.');

        const repayAmount = Math.floor(amount * 1.1);
        const dueAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        user.money += amount;
        user.loanAmount = repayAmount;
        user.loanDueAt = dueAt;
        await user.save();

        return interaction.editReply(
            `💵 대출 완료!\n\n받은 금액: ${formatMoney(amount)}\n상환 금액: ${formatMoney(repayAmount)} (이자 10%)\n만기일: <t:${Math.floor(dueAt.getTime() / 1000)}:R> (3일)\n\n⚠ 만기 초과 시 마이너스 통장 발생!\n🚫 거래 1~3일 정지 + \`/파산신청\` 후 보유 회사 삭제`
        );
    }

    if (interaction.commandName === '상환') {
        await interaction.deferReply({ flags: 64 });

        const user = await getUser(interaction.user.id);

        if (!user.loanAmount || user.loanAmount <= 0) {
            return interaction.editReply('❌ 현재 대출이 없습니다.');
        }

        if (user.money < user.loanAmount) {
            return interaction.editReply(`❌ 상환 금액 부족\n필요: ${formatMoney(user.loanAmount)}\n현재: ${formatMoney(user.money)}`);
        }

        const repaid = user.loanAmount;
        user.money -= repaid;
        user.loanAmount = 0;
        user.loanDueAt = null;
        await user.save();

        return interaction.editReply(
            `✅ 대출 상환 완료!\n\n💸 상환 금액: ${formatMoney(repaid)}\n💰 현재 잔액: ${formatMoney(user.money)}`
        );
    }

    if (interaction.commandName === '파산신청') {
        await interaction.deferReply({ flags: 64 });

        const user = await getUser(interaction.user.id);

        if (!user.isBankrupt) {
            return interaction.editReply('❌ 마이너스 통장 상태가 아닙니다.\n파산신청은 대출 만기 초과로 마이너스 통장이 발생한 경우에만 가능합니다.');
        }

        if (user.bankruptBanUntil && user.bankruptBanUntil > new Date()) {
            const remain = user.bankruptBanUntil - new Date();
            const days = Math.floor(remain / 1000 / 60 / 60 / 24);
            const hours = Math.floor((remain / 1000 / 60 / 60) % 24);
            return interaction.editReply(
                `❌ 아직 거래 정지 기간입니다.\n⏰ 해제까지: ${days}일 ${hours}시간\n\n거래 정지가 해제된 후 파산신청이 가능합니다.`
            );
        }

        const debt = user.minusBalance || 0;
        const myStocks = await Stock.find({
            owner: interaction.user.id,
            deleted: { $ne: true },
            listed: true
        });

        let deletedCompanies = [];
        for (const s of myStocks) {
            s.deleted = true;
            s.deletedAt = new Date();
            s.listed = false;
            s.price = 0;
            s.news.unshift('💀 대표 파산으로 인한 강제 폐업');
            s.news = s.news.slice(0, 5);
            await s.save();
            deletedCompanies.push(s.name);
        }

        user.isBankrupt = false;
        user.bankruptBanUntil = null;
        user.minusBalance = 0;
        user.money = 1000;
        await user.save();

        const companiesMsg = deletedCompanies.length > 0
            ? `\n🏢 삭제된 회사: ${deletedCompanies.join(', ')}`
            : '\n🏢 삭제된 회사: 없음';

        return interaction.editReply(
            `📢 **파산 신청 완료**\n\n` +
            `💸 탕감된 빚: ${formatMoney(debt)}${companiesMsg}\n\n` +
            `💰 지급된 기초 지원금: 1,000원\n\n` +
            `⚠ 파산 기록이 남으며, 새로운 출발을 응원합니다!`
        );
    }

    if (interaction.commandName === '유저활동시간') {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('유저');
        const presenceDoc = await Presence.findOne({ userId: targetUser.id });

        if (!presenceDoc) {
            return interaction.editReply('❌ 아직 활동 기록이 없습니다.\n(Presence Intent가 비활성화되어 있거나, 아직 상태 변화 기록이 쌓이지 않았을 수 있습니다)');
        }

        try {
            const { buffer, buckets } = await generatePresenceChart(presenceDoc, 3);
            const attachment = new AttachmentBuilder(buffer, { name: 'presence_chart.png' });

            const totalOnline = buckets.online.reduce((a, b) => a + b, 0);
            const totalIdle = buckets.idle.reduce((a, b) => a + b, 0);
            const totalDnd = buckets.dnd.reduce((a, b) => a + b, 0);
            const totalOffline = buckets.offline.reduce((a, b) => a + b, 0);

            const embed = new EmbedBuilder()
                .setTitle(`📊 ${targetUser.username}님의 활동시간 (최근 3일)`)
                .setColor('Blue')
                .addFields(
                    { name: '🟢 온라인', value: `${totalOnline.toFixed(1)}시간`, inline: true },
                    { name: '🌙 자리비움', value: `${totalIdle.toFixed(1)}시간`, inline: true },
                    { name: '⛔ 방해금지', value: `${totalDnd.toFixed(1)}시간`, inline: true },
                    { name: '⚫ 오프라인', value: `${totalOffline.toFixed(1)}시간`, inline: true }
                )
                .setImage('attachment://presence_chart.png')
                .setFooter({ text: '날짜는 한국 시간(KST) 기준이며, 오늘 데이터는 진행 중인 상태도 포함됩니다' });

            return interaction.editReply({ embeds: [embed], files: [attachment] });
        } catch (err) {
            console.error(err);
            return interaction.editReply('❌ 차트 생성 오류');
        }
    }

    if (interaction.commandName === '채팅순위') {
        await interaction.deferReply();

        const top = await ChatCount.find().sort({ count: -1 }).limit(10);

        if (top.length === 0) {
            return interaction.editReply('아직 채팅 기록이 없습니다.');
        }

        let text =
            padKo('순위', 6) +
            padKo('채팅수', 12) +
            '유저\n' +
            '─'.repeat(40) + '\n';

        for (let i = 0; i < top.length; i++) {
            let username = '알 수 없음';
            try {
                const discordUser = await client.users.fetch(top[i].userId);
                username = discordUser.username;
            } catch { }

            text +=
                padKo(String(i + 1), 6) +
                padKo(top[i].count.toLocaleString('ko-KR') + '개', 12) +
                username + '\n';
        }

        return interaction.editReply({
            content:
`💬 채팅 순위

\`\`\`
${text}
\`\`\``
        });
    }

    if (interaction.commandName === '마법의굼박고동님') {
        const question = interaction.options.getString('질문');

        const answers = [
            '그래',
            '아니',
            '안돼',
            '당연하지',
            '그럴리가',
            '다시한번물어봐',
            '**안 돼**',
            '기모찌찌',
            'ㅋㅋ 빸큐!'
        ];

        const answer = answers[Math.floor(Math.random() * answers.length)];

        return interaction.reply(`🐚 "마법의 굼박고동님, ${question}"\n\n${answer}`);
    }

    if (interaction.commandName === '역할선택') {
        await interaction.deferReply({ flags: 64 });

        const role = interaction.options.getRole('역할');

        const allowed = await SelectableRole.findOne({ roleId: role.id });
        if (!allowed) {
            return interaction.editReply('❌ 선택할 수 없는 역할입니다.\n관리자가 `/역할설정` 으로 등록한 역할만 선택 가능합니다.');
        }

        try {
            const member = await interaction.guild.members.fetch(interaction.user.id);

            if (member.roles.cache.has(role.id)) {
                await member.roles.remove(role.id);
                return interaction.editReply(`🗑 <@&${role.id}> 역할을 제거했습니다.`);
            } else {
                await member.roles.add(role.id);
                return interaction.editReply(`✅ <@&${role.id}> 역할을 부여했습니다.`);
            }
        } catch (err) {
            console.error(err);
            return interaction.editReply('❌ 역할 변경 실패 (봇의 역할 권한/순서를 확인해주세요)');
        }
    }

    if (interaction.commandName === '역할설정') {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ 관리자만 사용 가능', flags: 64 });
        }

        await interaction.deferReply({ flags: 64 });

        const role = interaction.options.getRole('역할');
        const existing = await SelectableRole.findOne({ roleId: role.id });

        if (existing) {
            await SelectableRole.deleteOne({ roleId: role.id });
            return interaction.editReply(`🗑 <@&${role.id}> 역할을 역할선택 풀에서 제거했습니다.`);
        } else {
            await SelectableRole.create({ roleId: role.id, roleName: role.name });
            return interaction.editReply(`✅ <@&${role.id}> 역할을 역할선택 풀에 추가했습니다.\n이제 \`/역할선택\` 으로 부여/해제할 수 있습니다.`);
        }
    }

    if (interaction.commandName === '초기화') {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ 관리자만 사용 가능', flags: 64 });
        }

        await interaction.deferReply();

        await Money.updateMany({}, {
            $set: {
                money: 1000,
                stocks: {},
                stockAvgPrice: {},
                buyCooldowns: {},
                lastTax: 0,
                lastTaxDate: null,
                deleteCost: 1000,
                blackjackWins: 0,
                gambleWins: 0,
                lastFortuneDate: null,
                fortuneStreak: 0,
                lastBegTime: null,
                lastGambleTime: null,
                lastSubsidyDate: null,
                recentCompanyCreatedAt: null,
                companyBoostUsed: false,
                gogumSubsidyUsed: false,
                crimeRisk: 0,
                taxEvasionActive: false,
                taxEvasionSaved: 0,
                stockManipUsed: false,
                stockManipUntil: null,
                crimeCount: 0,
                loanAmount: 0,
                loanDueAt: null,
                isBankrupt: false,
                bankruptBanUntil: null,
                minusBalance: 0,
            }
        });

        await Stock.deleteMany({});
        await GameEvent.updateMany({}, { $set: { active: false } });

        return interaction.editReply('🔄 **전체 초기화 완료!**\n모든 플레이어 자금 1,000원으로 초기화\n모든 회사 삭제 완료');
    }

});

client.on('error', console.error);

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.guild) return;

    try {
        await ChatCount.findOneAndUpdate(
            { userId: message.author.id },
            { $inc: { count: 1 } },
            { upsert: true }
        );
    } catch (err) {
        console.error('[채팅순위] 카운트 오류:', err);
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!aiChannelId) return;
    if (message.channel.id !== aiChannelId) return;

    try {
        await message.channel.sendTyping();

        // 채널별 대화 기록 가져오기
        if (!aiChatHistory.has(aiChannelId)) {
            aiChatHistory.set(aiChannelId, []);
        }
        const history = aiChatHistory.get(aiChannelId);

        // 새 유저 메시지 추가 (누가 보냈는지 포함)
        history.push({ role: 'user', content: `${message.author.username}: ${message.content}` });

        // 최근 AI_HISTORY_LIMIT개만 유지
        while (history.length > AI_HISTORY_LIMIT) history.shift();

        const systemPrompt =
            aiPersonality +
            '\n반드시 한국어로만 대답해. 절대 일본어, 영어, 중국어 등 다른 언어를 섞지 마.';

        const reply = await groq.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: [
                { role: "system", content: systemPrompt },
                ...history
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        const replyText = reply.choices[0].message.content;

        // 봇 응답도 기록에 추가
        history.push({ role: 'assistant', content: replyText });
        while (history.length > AI_HISTORY_LIMIT) history.shift();

        await message.reply(replyText);
    } catch (err) {
        console.error(err);
        await message.reply('❌ AI 오류');
    }
});

client.login(token);