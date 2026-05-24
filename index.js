const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Bot is alive');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});

const mongoose = require('mongoose');

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

        deleteCost: { type: Number, default: 1000 },

        blackjackWins: { type: Number, default: 0 },
        gambleWins: { type: Number, default: 0 },

        stocks: {
            type: Map,
            of: Number,
            default: {}
        }
    });

    const stockSchema = new mongoose.Schema({
        name: { type: String, unique: true },
        owner: String,

        // 삭제 여부
        deleted: {
            type: Boolean,
            default: false
        },

        // 삭제 시간
        deletedAt: {
            type: Date,
            default: null
        },

        price: { type: Number, default: 100 },

        listed: { type: Boolean, default: true },

        news: {
            type: [String],
            default: []
        },

        downStreak: {
            type: Number,
            default: 0
        },

        // 마지막 변동 시간
        lastChangedAt: {
            type: Date,
            default: Date.now
        },

        // 다음 변동 시간
        nextChangeAt: {
            type: Date,
            default: () => new Date(Date.now() + 1200000)
        }
    });

    const Groq = require("groq-sdk");

    const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
    });
    
    let aiPersonality = "너는 디스코드 봇이다. 반말로 짧게 답하되 과하지 않게 말한다.";

    const Stock = mongoose.model('Stock', stockSchema);

    const Money = mongoose.model('Money', moneySchema);

    async function getUser(userId) {

        return await Money.findOneAndUpdate(
            { userId },
            {
                $setOnInsert: {
                    userId,
                    money: 1000
                }
            },
            {
                returnDocument: 'after',
                upsert: true
            }
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
        GatewayIntentBits.MessageContent
    ]
});

const newsPages = new Map();

const blackjackGames = new Map();

const tttGames = new Map();

const deletedMessages = new Map();

client.on('messageDelete', message => {

    // 봇 메시지 무시
    if (message.author?.bot) return;

    deletedMessages.set(message.channel.id, {

        author: message.author.tag,
        content: message.content || '(내용 없음)',
        createdAt: new Date()

    });

});

const userFortunes = {};

const commands = [

    new SlashCommandBuilder()
        .setName('뉴스')
        .setDescription('다음 주식 변동 예측 뉴스를 확인합니다'),

    new SlashCommandBuilder()
        .setName('성격설정')
        .setDescription('AI 성격을 설정합니다')
        .addStringOption(option =>
            option
                .setName('프롬프트')
                .setDescription('AI 성격 설명')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('ai설정')
        .setDescription('AI 채널 설정')
        .addChannelOption(option =>
            option
                .setName('채널')
                .setDescription('AI가 대화할 채널')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('홀짝')
        .setDescription('홀짝 도박')
        .addStringOption(option =>
            option
                .setName('배팅')
                .setDescription('배팅 금액 또는 올인')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('선택')
                .setDescription('홀 또는 짝')
                .setRequired(true)
                .addChoices(
                    { name: '홀', value: '홀' },
                    { name: '짝', value: '짝' }
                )
        ),

    new SlashCommandBuilder()
        .setName('슬롯')
        .setDescription('슬롯머신')
        .addStringOption(option =>
            option
                .setName('배팅')
                .setDescription('배팅 금액 또는 올인')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('블랙잭')
        .setDescription('블랙잭 시작')
        .addStringOption(option =>
            option
                .setName('배팅')
                .setDescription('배팅 금액 또는 올인')
                .setRequired(true)
        ),


    new SlashCommandBuilder()
        .setName('돈순위')
        .setDescription('플레이어 돈 순위를 확인합니다'),



    new SlashCommandBuilder()
        .setName('회사삭제')
        .setDescription('회사를 삭제합니다')
        .addStringOption(option =>
            option
                .setName('회사')
                .setDescription('삭제할 회사 이름')
                .setRequired(true)
        ),



    new SlashCommandBuilder()
    .setName('주식')
    .setDescription('주식 정보 확인합니다.'),

    new SlashCommandBuilder()
        .setName('회사생성')
        .setDescription('주식 회사를 만듭니다')
        .addStringOption(option =>
            option
                .setName('이름')
                .setDescription('회사 이름')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('매수')
        .setDescription('주식을 구매합니다')
        .addStringOption(option =>
            option
                .setName('회사')
                .setDescription('회사 이름')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('수량')
                .setDescription('구매 수량')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('매도')
        .setDescription('주식을 판매합니다')
        .addStringOption(option =>
            option
                .setName('회사')
                .setDescription('회사 이름')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('수량')
                .setDescription('판매 수량')
                .setRequired(true)
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
            option
                .setName('개수')
                .setDescription('삭제할 메시지 개수')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('삭제로그')
        .setDescription('최근 삭제된 메시지를 확인합니다'),

    new SlashCommandBuilder()
        .setName('유저정보')
        .setDescription('유저정보를 확인합니다')
        .addUserOption(option =>
            option
                .setName('유저')
                .setDescription('정보를 볼 유저')
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName('틱택토')
        .setDescription('틱택토!!!!'),

    new SlashCommandBuilder()
        .setName('편지')
        .setDescription('유저에게 편지를 보냅니다')
        .addUserOption(option =>
            option.setName('유저')
                .setDescription('받는 사람')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('종류')
                .setDescription('편지 종류')
                .setRequired(true)
                .addChoices(
                    { name: '우정의 편지', value: 'friend' },
                    { name: '러브레터', value: 'love' },
                    { name: '결투신청서', value: 'duel' }
                )
        )
        .addStringOption(option =>
            option.setName('내용')
                .setDescription('편지 내용')
                .setRequired(true)
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
        option
            .setName('금액')
            .setDescription('배팅 금액 또는 올인')
            .setRequired(true)
    ),

    new SlashCommandBuilder()
    .setName('구걸')
    .setDescription('옛다 거지야'),

]
    .map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('슬래시 명령어 등록중...');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );

        console.log('슬래시 명령어 등록 완료!');
    } catch (error) {
        console.error(error);
    }
})();

client.once('clientReady', () => {

    console.log(`${client.user.tag} 로그인 완료!`);
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

setInterval(async () => {

    const stocks = await Stock.find({
        deleted: { $ne: true }
    });

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
        '대표에게 막말 논란.. 결국 못참은 대표, 분노의 오줌 갈기기 '
    ];

    for (let stock of stocks) {

        if (!stock.listed) continue;

        // =========================
        // 퍼센트 기반 변동
        // =========================

        const random = Math.random();

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

        // 🚀 폭등 5%
        if (random < 0.05) {

            percent =
                Math.random() * 2 + 1;

            const boom =
                boomMessages[
                    Math.floor(Math.random() * boomMessages.length)
                ];

            stock.news.unshift(boom);
        }

        // 💀 폭락 5%
        else if (random < 0.10) {

            percent =
                -(Math.random() * 0.7 + 0.3);

            const crash =
                crashMessages[
                    Math.floor(Math.random() * crashMessages.length)
                ];

            stock.news.unshift(crash);
        }

        // 📈 일반 변동 90%
        else {

            percent =
                (Math.random() * 40 - 20) / 100;
            // -20% ~ +20%
        }

        // 실제 변동값 계산
        let change =
            Math.floor(stock.price * percent);

        // 최소 변동 보정
        if (change === 0) {

            change =
                Math.random() < 0.5
                    ? -1
                    : 1;
        }

        // 기존 가격 저장
        const oldPrice = stock.price;

        // 가격 반영
        stock.price += change;

        // 변동 시간 기록
        stock.lastChangedAt = new Date();
        stock.nextChangeAt = new Date(Date.now() + 1200000);

        // =========================
        // 뉴스 이벤트
        // =========================

        const eventChance = Math.random();

        // 호재
        if (eventChance < 0.1) {

            const news =
                goodNews[
                    Math.floor(Math.random() * goodNews.length)
                ];

            const bonus =
                Math.floor(stock.price * (
                    Math.random() * 0.3 + 0.1
                ));

            stock.price += bonus;

            stock.news.unshift(
                `🟢 ${news} (+${bonus}원)`
            );
        }

        // 악재
        else if (eventChance < 0.2) {

            const news =
                badNews[
                    Math.floor(Math.random() * badNews.length)
                ];

            const minus =
                Math.floor(stock.price * (
                    Math.random() * 0.3 + 0.1
                ));

            stock.price -= minus;

            stock.news.unshift(
                `🔴 ${news} (-${minus}원)`
            );
        }

        // 음수 방지
        if (stock.price < 0) {
            stock.price = 0;
        }

        // =========================
        // 연속 하락 체크
        // =========================

        if (stock.price < oldPrice) {

            stock.downStreak += 1;

        } else {

            stock.downStreak = 0;
        }

        // 연속 하락 경고
        if (stock.downStreak >= 5) {

            stock.news.unshift(
                `⚠ ${stock.downStreak}연속 하락중!!`
            );
        }

        // =========================
        // 자동 상장폐지
        // =========================

        if (
            stock.listed &&
            (
                stock.price <= 5 ||
                stock.downStreak >= 9
            )
        ) {

            stock.listed = false;
            stock.price = 0;

            if (stock.downStreak >= 9) {

                stock.news.unshift(
                    '💀 9연속 하락으로 상장폐지'
                );

            } else {

                stock.news.unshift(
                    '💀 주가 5원 이하로 상장폐지'
                );
            }

            // 뉴스 최대 5개 유지
            stock.news = stock.news.slice(0, 5);

            // 즉시 저장
            await stock.save();

            // 다음 회사 처리
            continue;
        }

        // =========================
        // 대표 수수료 지급
        // =========================

        if (stock.owner && stock.listed) {

            const owner = await getUser(stock.owner);

            const fee =
                Math.floor(stock.price * 0.1);

            owner.money += fee;

            await owner.save();
        }

        // 뉴스 최대 5개 유지
        stock.news = stock.news.slice(0, 5);

        await stock.save();
        }

}, 1200000);


client.on('interactionCreate', async interaction => {

   try {

        // 버튼 처리
        if (interaction.isButton()) {

            // 뉴스 페이지

            // 뉴스 페이지 버튼
if (
        interaction.customId.startsWith('news_prev_') ||
        interaction.customId.startsWith('news_next_')
    ) {

        await interaction.deferUpdate();

        try {

            const pageId =
                interaction.customId.split('_')[2];

            const data =
                newsPages.get(pageId);

            if (!data) {

                return interaction.editReply({
                    content: '❌ 뉴스가 만료됨',
                    components: []
                });
            }

            if (
                interaction.user.id !== data.userId
            ) {

                return interaction.followUp({
                    content: '❌ 본인만 사용 가능',
                    flags: 64
                });
            }

            if (
                interaction.customId.startsWith('news_prev_')
            ) {

                data.page--;

            } else {

                data.page++;
            }

            if (data.page < 0)
                data.page = 0;

            if (data.page >= data.pages.length)
                data.page = data.pages.length - 1;

            const row =
                new ActionRowBuilder()
                    .addComponents(

                        new ButtonBuilder()
                            .setCustomId(`news_prev_${pageId}`)
                            .setLabel('◀')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(data.page === 0),

                        new ButtonBuilder()
                            .setCustomId(`news_next_${pageId}`)
                            .setLabel('▶')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(
                                data.page === data.pages.length - 1
                            )
                    );

            return interaction.editReply({
                content:
                    `🗞 주식 뉴스 (${data.page + 1}/${data.pages.length})\n\n` +
                    data.pages[data.page],
                components: [row]
            });

        } catch (err) {

            console.error(err);

            return interaction.followUp({
                content: '❌ 오류 발생',
                flags: 64
            });
        }
    }

            //블랙잭

            if (
                interaction.customId === 'blackjack_hit' ||
                interaction.customId === 'blackjack_stand'
            ) {

                const game =
                    blackjackGames.get(interaction.user.id);

                if (!game) {
                    return interaction.reply({
                        content: '게임 없음',
                        flags: 64
                    });
                }

                const user =
                    await getUser(interaction.user.id);

                const drawCard = () =>
                    Math.floor(Math.random() * 10) + 1;

                const playerTotal = () =>
                    game.playerCards.reduce((a,b)=>a+b,0);

                const dealerTotal = () =>
                    game.dealerCards.reduce((a,b)=>a+b,0);

                // HIT
                if (interaction.customId === 'blackjack_hit') {

                    game.playerCards.push(drawCard());

                    if (playerTotal() > 21) {

                        user.money -= game.bet;

                        await user.save();

                        blackjackGames.delete(interaction.user.id);

                        return interaction.update({
                            content:
                                `💀 버스트!\n` +
                                `카드: ${game.playerCards.join(', ')}\n` +
                                `현재 돈: ${user.money}원`,
                            components: []
                        });
                    }

                    return interaction.update({
                        content:
                            `🃏 카드: ${game.playerCards.join(', ')}\n` +
                            `합계: ${playerTotal()}`,
                        components: interaction.message.components
                    });
                }

                // STAND
                while (dealerTotal() < 17) {
                    game.dealerCards.push(drawCard());
                }

                let result;

                if (
                    dealerTotal() > 21 ||
                    playerTotal() > dealerTotal()
                ) {

                    user.money += game.bet;

                    result = '🎉 승리!';

                } else if (
                    playerTotal() < dealerTotal()
                ) {

                    user.money -= game.bet;

                    result = '💀 패배';

                } else {

                    result = '🤝 무승부';
                }

                await user.save();

                blackjackGames.delete(interaction.user.id);

                return interaction.update({
                    content:
                        `${result}\n\n` +
                        `내 카드: ${game.playerCards.join(', ')} (${playerTotal()})\n` +
                        `딜러 카드: ${game.dealerCards.join(', ')} (${dealerTotal()})\n\n` +
                        `💰 현재 돈: ${user.money}원`,
                    components: []
                });
            }

            // 편지 열기

            if (interaction.customId.startsWith('letter_')) {

                const id = interaction.customId.split('_')[1];

                const letter = await Letter.findById(id);

                if (!letter) {
                    return interaction.reply({
                        content: '편지를 찾을 수 없음',
                        flags: 64
                    });
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
                        {
                            name: '보낸 사람',
                            value: fromUser.username
                        },
                        {
                            name: '날짜',
                            value: `<t:${Math.floor(letter.createdAt / 1000)}:R>`
                        }
                    )
                    .setColor(
                        letter.type === 'love'
                            ? 'Red'
                            : letter.type === 'duel'
                            ? 'DarkRed'
                            : 'Green'
                    );

                return interaction.reply({
                    embeds: [embed],
                    flags: 64
                });
            }

            // 편지 페이지 이동

            if (
                interaction.customId.startsWith('letters_prev_') ||
                interaction.customId.startsWith('letters_next_')
            ) {

                const perPage = 5;

                let page =
                    Number(interaction.customId.split('_')[2]) || 0;

                const direction =
                    interaction.customId.startsWith('letters_next_')
                        ? 1
                        : -1;

                page = Math.max(0, page + direction);

                const allLetters = await Letter.find({
                    to: interaction.user.id
                }).sort({ createdAt: -1 });

                const start = page * perPage;

                const currentLetters =
                    allLetters.slice(start, start + perPage);

                const buttons = currentLetters.map((l, index) =>
                    new ButtonBuilder()
                        .setCustomId(`letter_${l._id}`)
                        .setLabel(
                            `${l.type === 'love'
                                ? '💌 러브'
                                : l.type === 'duel'
                                ? '⚔ 결투'
                                : '🤝 우정'} #${start + index + 1}`
                        )
                        .setStyle(ButtonStyle.Primary)
                );

                const rows = [];

                if (buttons.length > 0) {
                    rows.push(
                        new ActionRowBuilder().addComponents(buttons)
                    );
                }

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
                            .setDisabled(
                                start + perPage >= allLetters.length
                            )
                    )
                );

                return interaction.update({
                    content: `📬 편지함 (${allLetters.length}개)`,
                    components: rows
                });
            }

            // 편지 삭제

            if (interaction.customId.startsWith('deleteletter_')) {

                const id = interaction.customId.split('_')[1];

                const letter = await Letter.findById(id);

                if (!letter) {

                    return interaction.reply({
                        content: '이미 삭제된 편지입니다.',
                        flags: 64
                    });
                }

                await Letter.findByIdAndDelete(id);

                return interaction.update({
                    content: '🗑 편지가 삭제되었습니다.',
                    embeds: [],
                    components: []
                });
            }

            // 틱택토

            if (interaction.customId.startsWith('ttt_')) {

                const [, gameId, index] =
                    interaction.customId.split('_');

                const game = tttGames.get(gameId);

                if (!game) {

                    return interaction.reply({
                        content: '게임이 종료됨',
                        flags: 64
                    });
                }

                if (game.board[index]) {

                    return interaction.reply({
                        content: '이미 선택된 칸임',
                        flags: 64
                    });
                }

                game.board[index] = game.turn;

                const winPatterns = [
                    [0,1,2],
                    [3,4,5],
                    [6,7,8],
                    [0,3,6],
                    [1,4,7],
                    [2,5,8],
                    [0,4,8],
                    [2,4,6]
                ];

                const checkWin = (symbol) =>
                    winPatterns.some(p =>
                        p.every(i => game.board[i] === symbol)
                    );

                if (checkWin(game.turn)) {

                    tttGames.delete(gameId);

                    return interaction.update({
                        content: `🏆 ${game.turn} 승리!`,
                        components: []
                    });
                }

                const isDraw =
                    game.board.every(cell => cell !== null);

                if (isDraw) {

                    tttGames.delete(gameId);

                    return interaction.update({
                        content: `🤝 무승부!`,
                        components: []
                    });
                }

                game.turn =
                    game.turn === '❌'
                        ? '⭕'
                        : '❌';

                return interaction.update({
                    content: `현재 턴: ${game.turn}`,
                    components: createBoard(gameId)
                });
            }

            return;
        }

        // =========================
        // 도움말 드롭다운
        // =========================
        if (interaction.isStringSelectMenu()) {

            if (interaction.customId === 'help_menu') {

                const value = interaction.values[0];

                let embed;

                if (value === 'greet') {

                    embed = new EmbedBuilder()
                        .setTitle('👋 인삿말 도움말')
                        .setColor('Green')
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
                        .setTitle('🎮 게임 도움말')
                        .setColor('Blue')
                        .setDescription(`
        \`/틱택토\`
        틱택토!!

        \`//홀짝 배팅: 선택:\`
        홀짝 도박을 합니다. 

        \`/슬롯 배팅:\`
        슬롯머신을 돌립니다. 

        \`/블랙잭 배팅:\`
        블랙잭을 시작합니다. 

        \`/도박 금액:\`
        돈을 걸고 도박합니다. %50!!
        `);
                }

                if (value === 'economy') {

                    embed = new EmbedBuilder()
                        .setTitle('💰 경제 도움말')
                        .setColor('Gold')
                        .setDescription(`
        \`/돈\`
        현재 돈을 확인합니다!!

        \`/돈순위\`
        현재 돈 순위를 확인합니다!!

        \`/구걸\`
        하루 다섯번 500원을 획득합니다!!

        \`/운세\`
        오늘의 운세를 확인합니다!! (출석체크!! 1000원 씩 흭득!!)

        \`/회사삭제 회사:\`
        1000원으로 회사를 삭제합니다!! 삭제할때마다 삭제비용이 올라갑니다. 

        \`/회사생성 이름:\`
        1000원으로 회사를 생성합니다!! 

        \`/매수 회사: 수량:\`
        주식을 구입합니다!!

        \`/매도 회사: 수량:\`
        주식을 판매합니다!!

        \`/뉴스\`
        주식 변동률을 미리 확인합니다.

        \`/주식\`
        주식 목록 확인
        `);
                }

                if (value === 'letter') {

                    embed = new EmbedBuilder()
                        .setTitle('📨 편지 도움말')
                        .setColor('Red')
                        .setDescription(`
        \`/편지\`
        유저에게 편지 보내기

        \`/편지함\`
        받은 편지 확인
        `);
                }

                if (value === 'manage') {

                    embed = new EmbedBuilder()
                        .setTitle('🛠 관리 도움말')
                        .setColor('Red')
                        .setDescription(`
        \`/청소\`
        메시지 삭제

        \`/ai설정 채널:\`
        ai대화 채널을 설정합니다.

        \`/성격설정 프롬프트:\`
        ai의 성격혹은 말투, 등 을 설정합니다.

        \`/삭제로그\`
        삭제 메시지 확인
        `);
                }

                return interaction.update({
                    embeds: [embed],
                    components: []
                });
            }
        }

    } catch (error) {

        console.error(error);

        try {

            if (interaction.deferred || interaction.replied) {

                await interaction.editReply({
                    content: '❌ 오류 발생'
                });

            } else {

                await interaction.reply({
                    content: '❌ 오류 발생',
                    flags: 64
                });
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

        const today = new Date().toLocaleDateString('sv-SE', {
            timeZone: 'Asia/Seoul'
        });

        const yesterday = new Date(Date.now() - 86400000)
            .toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

        // ❌ 이미 오늘 했으면
        if (user.lastFortuneDate === today) {

            const now = new Date();

            const tomorrow = new Date();

            tomorrow.setHours(24, 0, 0, 0);

            const diff = tomorrow - now;

            const hours =
                Math.floor(diff / 1000 / 60 / 60);

            const minutes =
                Math.floor((diff / 1000 / 60) % 60);

            return interaction.editReply(
                `❌ 하루에 한번만 가능!\n` +
                `⏰ 남은 시간: ${hours}시간 ${minutes}분`
            );
        }

        // 🔥 연속 체크
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
            `🔮 ${interaction.user.username}님의 오늘 운세\n\n` +
            `${random}\n\n` +
            `🔥 연속 출석: ${user.fortuneStreak}일\n` +
            `💰 보상: +${reward}원`
        );
    }
    
    if (interaction.commandName === '도움말') {

        const embed = new EmbedBuilder()
            .setTitle('🐝 양봉이')
            .setDescription(
                '안녕 날 소개하지 난 양봉장의 전용 봇 양봉이라고 하오\n\n' +
                '아래 카테고리에서 명령어 확인'
            )
            .setColor('Green')

            // 이미지 하나만
            .setThumbnail(
                'https://cdn.discordapp.com/attachments/1110460136373366845/1506536312423841873/image.png'
            )

            .setFooter({
                text: '양봉장의 전용 봇, 아이스크림을 좋아한다. '
            });

        const menu = new StringSelectMenuBuilder()
            .setCustomId('help_menu')
            .setPlaceholder('카테고리 선택')
            .addOptions(
                {
                    label: '👋 인삿말',
                    description: '기본 인삿말 명령어',
                    value: 'greet'
                },
                {
                    label: '🎮 게임',
                    description: '게임 명령어',
                    value: 'game'
                },
                {
                    label: '💰 경제',
                    description: '돈/주식 명령어',
                    value: 'economy'
                },
                {
                    label: '📨 편지',
                    description: '편지 기능',
                    value: 'letter'
                },
                {
                    label: '🛠 관리',
                    description: '관리 명령어',
                    value: 'manage'
                }
            );

        const row = new ActionRowBuilder()
            .addComponents(menu);

        return interaction.reply({
            embeds: [embed],
            components: [row],
        });
    }

        if (interaction.commandName === '삭제로그') {

            const data =
                deletedMessages.get(interaction.channel.id);

            if (!data) {

                return interaction.reply({
                    content: '❌ 최근 삭제된 메시지가 없다!',
                    flags: 64
                });

            }

            const embed = new EmbedBuilder()
                .setTitle('🗑 최근 삭제된 메시지')
                .addFields(
                    {
                        name: '작성자',
                        value: data.author
                    },
                    {
                        name: '내용',
                        value: data.content
                    }
                )
                .setColor('Red');

            await interaction.reply({
                embeds: [embed]
            });

        }

    if (interaction.commandName === '유저정보') {

        await interaction.deferReply();

        const targetUser =
            interaction.options.getUser('유저') || interaction.user;

        // 기본 유저 정보
        const user = await client.users.fetch(targetUser.id);

        // 서버 멤버 정보 (없을 수도 있음 → 안전 처리)
        let member = null;
        try {
            member = await interaction.guild.members.fetch(targetUser.id);
        } catch {
            member = null;
        }

        // 추가 정보
        const fullUser = await user.fetch();

        const roles = member.roles.cache
            .filter(r => r.id !== interaction.guild.id)
            .map(r => `<@&${r.id}>`)
            .join(' ') || '없음';

        const embed = new EmbedBuilder()
            .setTitle('👤 유저 정보')
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setImage(fullUser.bannerURL({ size: 1024 }) || null)
            .setColor('Blue')
            .addFields(
                {
                    name: '유저 닉네임',
                    value: member?.nickname || user.username,
                    inline: true
                },
                {
                    name: '유저 ID',
                    value: user.id,
                    inline: true
                },
                {
                    name: '디스코드 가입일',
                    value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
                    inline: true
                },
                {
                    name: '서버 가입일',
                    value: member
                        ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
                        : '서버 없음',
                    inline: true
                },
                {
                    name: '서버 역할',
                    value: roles
                }
            );

        return interaction.editReply({ embeds: [embed] });
    }

    if (interaction.commandName === '틱택토') {

        await interaction.deferReply();

        const gameId = interaction.id;

        tttGames.set(gameId, {
            board: Array(9).fill(null),
            turn: '❌'
        });

        return interaction.editReply({
            content: '🎮 틱택토 시작! ❌ 먼저',
            components: createBoard(gameId)
        });
    }

    if (interaction.commandName === '편지') {

        const to = interaction.options.getUser('유저');
        const type = interaction.options.getString('종류');
        const content = interaction.options.getString('내용');

        const id = Date.now().toString();

        const newLetter = await Letter.create({
            from: interaction.user.id,
            to: to.id,
            type,
            content
        });

        await interaction.reply({
            content: `📨 편지를 보냈습니다! (${to.username})`,
            flags: 64
        });

        // 받은 사람 DM
        try {
            await to.send(`📬 새로운 편지가 도착했습니다! 양봉장에서 **/편지함** 으로 확인하세요.`);
        } catch { }
    }


    if (interaction.commandName === '편지함') {

        const perPage = 5;
        const page = 0;

        // 🔥 DB에서 가져오기
        const allLetters = await Letter.find({
            to: interaction.user.id
        }).sort({ createdAt: -1 });

        if (allLetters.length === 0) {
            return interaction.reply({
                content: '📭 받은 편지가 없습니다.',
                flags: 64
            });
        }

        const start = page * perPage;
        const currentLetters = allLetters.slice(start, start + perPage);

        const buttons = currentLetters.map((l, index) =>
            new ButtonBuilder()
                .setCustomId(`letter_${l._id}`)
                .setLabel(
                    `${l.type === 'love'
                        ? '💌 러브'
                        : l.type === 'duel'
                            ? '⚔ 결투'
                            : '🤝 우정'} #${start + index + 1}`
                )
                .setStyle(ButtonStyle.Primary)
        );

        const rows = [];

        if (buttons.length > 0) {
            rows.push(
                new ActionRowBuilder().addComponents(buttons)
            );
        }

        const navButtons = new ActionRowBuilder().addComponents(
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
        );

        rows.push(navButtons);

        await interaction.reply({
            content: `📬 편지함 (${allLetters.length}개)`,
            components: rows,
            flags: 64
        });
    }

    if (interaction.commandName === '돈') {

        const user = await getUser(interaction.user.id);

        return interaction.reply({
            content: `💰 현재 돈: ${user.money}원`,
            flags: 64
        });
    }

    if (interaction.commandName === '도박') {

        const userId = interaction.user.id;

        const amountInput =
            interaction.options.getString('금액');

        const user = await getUser(userId);

        let bet;

        if (
            amountInput === '올인' ||
            amountInput === 'allin'
        ) {

            bet = user.money;

        } else {

            bet = parseInt(amountInput);
        }

        if (bet <= 0) {
            return interaction.reply({
                content: '❌ 1원 이상 걸어라.',
                flags: 64
            });
        }

        if (user.money < bet) {
            return interaction.reply({
                content: '❌ 돈 부족',
                flags: 64
            });
        }

        const win = Math.random() < 0.5;

        if (win) {
            user.money += bet;
        } else {
            user.money -= bet;
        }

        await user.save();

        return interaction.reply(
            `${win ? '🎉 승리!' : '💀 패배...'}\n` +
            `${win ? '+' : '-'}${bet}원\n현재 돈: ${user.money}원`
        );
    }

    if (interaction.commandName === '회사생성') {

        await interaction.deferReply();

        const name =
            interaction.options.getString('이름');

        const exists = await Stock.findOne({ name });

        if (exists) {

            // 삭제된 회사 포함
            if (exists.deleted) {

                return interaction.editReply(
                    '❌ 삭제된 회사 이름은 다시 사용할 수 없습니다.'
                );
            }

            return interaction.editReply(
                '이미 존재하는 회사입니다.'
            );
        }

        const user =
            await getUser(interaction.user.id);

        // 회사 생성 비용
        const createCost = 1000;

        if (user.money < createCost) {

            return interaction.editReply(
                `❌ 회사 생성 비용 부족 (${createCost}원 필요)`
            );
        }

        // 최대 2개 제한
        const myCompanies =
            await Stock.countDocuments({
                owner: interaction.user.id
            });

        if (myCompanies >= 2) {

            return interaction.editReply(
                '❌ 회사는 최대 2개까지 생성 가능'
            );
        }

        user.money -= createCost;
        await user.save();

        await Stock.create({
            name,
            owner: interaction.user.id,
            price: 1000,
            news: [
                `📰 ${name} 회사 창립! 투자자 관심 집중`
            ]
        });

        return interaction.editReply(
            `🏢 ${name} 회사 생성 완료!\n` +
            `💸 생성 비용: ${createCost}원`
        );
    }

    if (interaction.commandName === '매수') {
        await interaction.deferReply();

        const name = interaction.options.getString('회사');
        const qty = interaction.options.getInteger('수량');

        const stock = await Stock.findOne({ name, listed: true });
        if (!stock) return interaction.editReply('회사 없음');

        const user = await getUser(interaction.user.id);

        const cost = stock.price * qty;

        if (user.money < cost) {
            return interaction.editReply('돈이 부족합니다');
        }

        user.money -= cost;
        user.stocks.set(name, (user.stocks.get(name) || 0) + qty);

        await user.save();

        stock.news.unshift(
            `📈 ${interaction.user.username}님이 ${qty}주 매수`
        );

        stock.news = stock.news.slice(0, 5);

        await stock.save();

        return interaction.editReply(`📈 ${name} ${qty}주 매수 완료!`);
    }

    if (interaction.commandName === '매도') {
        await interaction.deferReply();

        const name = interaction.options.getString('회사');
        const qty = interaction.options.getInteger('수량');

        const stock = await Stock.findOne({ name, listed: true });
        if (!stock) return interaction.editReply('회사 없음');

        const user = await getUser(interaction.user.id);

        const owned = user.stocks.get(name) || 0;

        if (owned < qty) {
            return interaction.editReply('주식이 부족합니다.');
        }

        user.stocks.set(name, owned - qty);
        user.money += stock.price * qty;

        await user.save();

        stock.news.unshift(
            `📉 ${interaction.user.username}님이 ${qty}주 매도`
        );

        stock.news = stock.news.slice(0, 5);

        await stock.save();

        return interaction.editReply(`💰 ${name} ${qty}주 매도 완료`);
    }

    if (interaction.commandName === '주식') {

        await interaction.deferReply();

        const stocks = await Stock.find();

        if (stocks.length === 0) {
            return interaction.editReply('주식 없음');
        }

        const user = await getUser(interaction.user.id);

        // 회사 목록 표
        let companyTable =
            '회사명           가격        상태\n' +
            '────────────────────────────\n';

        for (const s of stocks) {

            const name =
                s.name.padEnd(15, ' ');

            const price =
                `${s.price}원`.padEnd(10, ' ');

            const status =
                s.listed ? '상장중' : '상장폐지';

            companyTable +=
                `${name}${price}${status}\n`;

            // 최근 뉴스 표시
            if (s.news && s.news.length > 0) {

                companyTable +=
                    `📰 ${s.news[0]}\n`;
            }

            companyTable +=
                '────────────────────────────\n';
        }

        // 내 주식 표
        let myStockTable =
            '회사명           보유수량\n' +
            '────────────────────\n';

        let hasStock = false;

        for (const [name, qty] of user.stocks) {

            if (qty <= 0) continue;

            hasStock = true;

            myStockTable +=
                `${name.padEnd(15, ' ')}${qty}주\n`;
        }

        if (!hasStock) {
            myStockTable += '보유 주식 없음';
        }

        return interaction.editReply({
            content:
    `🏢 현재 생성된 회사 목록

    \`\`\`
    ${companyTable}
    \`\`\`

    📈 ${interaction.user.username}님의 주식 현황

    \`\`\`
    ${myStockTable}
    \`\`\``
        });
    }

    if (interaction.commandName === '뉴스') {

        await interaction.deferReply();

        const stocks = await Stock.find({
            listed: true,
            deleted: { $ne: true }
        });

        if (stocks.length === 0) {
            return interaction.editReply('상장된 회사 없음');
        }

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

            const random = Math.random();

            let type;
            let news;
            let chance;

            if (random < 0.05) {

                type = '🚀 폭등 가능성';
                chance = '5%';

                news =
                    boomPreview[
                        Math.floor(Math.random() * boomPreview.length)
                    ];

            } else if (random < 0.10) {

                type = '💀 폭락 가능성';
                chance = '5%';

                news =
                    crashPreview[
                        Math.floor(Math.random() * crashPreview.length)
                    ];

            } else if (random < 0.55) {

                type = '📈 상승 예상';
                chance = '45%';

                news =
                    goodPreview[
                        Math.floor(Math.random() * goodPreview.length)
                    ];

            } else {

                type = '📉 하락 예상';
                chance = '45%';

                news =
                    badPreview[
                        Math.floor(Math.random() * badPreview.length)
                    ];
            }

            const lastTime =
                stock.lastChangedAt
                    ? `<t:${Math.floor(stock.lastChangedAt.getTime() / 1000)}:R>`
                    : '없음';

            const nextTime =
                stock.nextChangeAt
                    ? `<t:${Math.floor(stock.nextChangeAt.getTime() / 1000)}:R>`
                    : '없음';

            pages.push(

    `🏢 ${stock.name}

    💰 현재 가격: ${stock.price}원

    📊 예상 변동:
    ${type}

    🎲 확률:
    ${chance}

    📰 뉴스:
    ${news}

    ⏰ 최근 변동:
    ${lastTime}

    🕒 다음 변동:
    ${nextTime}`
            );
        }

        const pageId = interaction.id;

        newsPages.set(pageId, {
            userId: interaction.user.id,
            pages,
            page: 0
        });

        const row =
            new ActionRowBuilder()
                .addComponents(

                    new ButtonBuilder()
                        .setCustomId(`news_prev_${pageId}`)
                        .setLabel('◀')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),

                    new ButtonBuilder()
                        .setCustomId(`news_next_${pageId}`)
                        .setLabel('▶')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(
                            pages.length <= 1
                        )
                );

        return interaction.editReply({
            content:
                `🗞 주식 뉴스 (1/${pages.length})\n\n` +
                pages[0],
            components: [row]
        });
}


    if (interaction.commandName === '구걸') {

        await interaction.deferReply({ flags: 64 });

        const user = await getUser(interaction.user.id);

        const now = Date.now();

        // 10분 쿨타임
        if (user.lastBegTime) {

            const diff =
                now - new Date(user.lastBegTime).getTime();

            const cooldown =
                10 * 60 * 1000;

            if (diff < cooldown) {

                const remain =
                    cooldown - diff;

                const minutes =
                    Math.floor(remain / 1000 / 60);

                const seconds =
                    Math.floor((remain / 1000) % 60);

                return interaction.editReply(
                    `❌ 아직 구걸 못함!\n` +
                    `⏰ 남은 시간: ${minutes}분 ${seconds}초`
                );
            }
        }

        // 100~300 랜덤 지급
        const reward =
            Math.floor(Math.random() * 201) + 100;

        user.money += reward;

        user.lastBegTime = new Date();

        await user.save();

        return interaction.editReply(
            `🪙 ${reward}원을 구걸했다!\n` +
            `💰 현재 돈: ${user.money}원`
        );
    }


    if (interaction.commandName === '돈순위') {

        await interaction.deferReply();

        const users = await Money.find()
            .sort({ money: -1 })
            .limit(10);

        let text =
            '순위   돈        유저\n' +
            '────────────────────────\n';

        for (let i = 0; i < users.length; i++) {

            let username = '알 수 없음';

            try {
                const discordUser =
                    await client.users.fetch(users[i].userId);

                username = discordUser.username;
            } catch {}

            text +=
                `${String(i + 1).padEnd(6)} ` +
                `${String(users[i].money).padEnd(10)} ` +
                `${username}\n`;
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

        const name =
            interaction.options.getString('회사');

        const stock = await Stock.findOne({ name });

        if (!stock) {
            return interaction.editReply('❌ 회사 없음');
        }

        // 자기 회사만 삭제 가능
        if (stock.owner !== interaction.user.id) {
            return interaction.editReply('❌ 자기 회사만 삭제 가능');
        }

        const user = await getUser(interaction.user.id);

        // 삭제 비용 없으면 생성
        if (!user.deleteCost) {
            user.deleteCost = 1000;
        }

        // 돈 부족
        if (user.money < user.deleteCost) {

            return interaction.editReply(
                `❌ 회사 삭제 비용 부족\n현재 비용: ${user.deleteCost}원`
            );
        }

        // 돈 차감
        user.money -= user.deleteCost;

        // 다음 비용 증가
        const currentCost = user.deleteCost;
        user.deleteCost += 1000;

        await user.save();

        stock.deleted = true;
        stock.deletedAt = new Date();

        stock.listed = false;
        stock.price = 0;

        stock.news.unshift(
            `💀 회사 삭제됨`
        );

        await stock.save();

        return interaction.editReply(
            `🗑 ${name} 회사 삭제 완료!\n` +
            `💸 삭제 비용: ${currentCost}원\n` +
            `📈 다음 삭제 비용: ${user.deleteCost}원`
        );
    }


    if (interaction.commandName === '홀짝') {

        const user = await getUser(interaction.user.id);

        const input =
            interaction.options.getString('배팅');

        const choice =
            interaction.options.getString('선택');

        let bet;

        if (input === '올인') {
            bet = user.money;
        } else {
            bet = parseInt(input);
        }

        if (!bet || bet <= 0) {
            return interaction.reply('❌ 배팅 오류');
        }

        if (user.money < bet) {
            return interaction.reply('❌ 돈 부족');
        }

        const num =
            Math.floor(Math.random() * 10) + 1;

        const result =
            num % 2 === 0 ? '짝' : '홀';

        const win = choice === result;

        if (win) {
            user.money += bet;
        } else {
            user.money -= bet;
        }

        await user.save();

        return interaction.reply(
            `🎲 숫자: ${num}\n` +
            `${win ? '🎉 승리!' : '💀 패배'}\n` +
            `현재 돈: ${user.money}원`
        );
    }


    if (interaction.commandName === '슬롯') {

        const user = await getUser(interaction.user.id);

        const input =
            interaction.options.getString('배팅');

        let bet;

        if (
            input === '올인' ||
            input === 'allin'
        ) {
            bet = user.money;
        } else {
            bet = parseInt(input);
        }

        if (!bet || bet <= 0) {
            return interaction.reply('❌ 배팅 오류');
        }

        if (user.money < bet) {
            return interaction.reply('❌ 돈 부족');
        }

        const icons = ['🍒','🍋','💎','💀','🍀'];

        const roll = [
            icons[Math.floor(Math.random()*icons.length)],
            icons[Math.floor(Math.random()*icons.length)],
            icons[Math.floor(Math.random()*icons.length)]
        ];

        let reward = 0;

        if (
            roll[0] === roll[1] &&
            roll[1] === roll[2]
        ) {

            if (roll[0] === '💎') {
                reward = bet * 10;
            }

            else if (roll[0] === '💀') {
                reward = -Math.floor(user.money / 2);
            }

            else {
                reward = bet * 3;
            }

        } else {

            reward = -bet;
        }

        user.money += reward;

        if (user.money < 0) {
            user.money = 0;
        }

        await user.save();

        return interaction.reply(
            `🎰 ${roll.join(' | ')}\n\n` +
            `${reward >= 0
                ? `🎉 +${reward}원`
                : `💀 ${reward}원`
            }\n` +
            `💰 현재 돈: ${user.money}원`
        );
    }

    if (interaction.commandName === '블랙잭') {

        const user = await getUser(interaction.user.id);

        const input =
            interaction.options.getString('배팅');

        let bet;

        if (
            input === '올인' ||
            input === 'allin'
        ) {
            bet = user.money;
        } else {
            bet = parseInt(input);
        }

        if (!bet || bet <= 0) {
            return interaction.reply('❌ 배팅 오류');
        }

        if (user.money < bet) {
            return interaction.reply('❌ 돈 부족');
        }

        const drawCard = () =>
            Math.floor(Math.random() * 10) + 1;

        const playerCards = [
            drawCard(),
            drawCard()
        ];

        const dealerCards = [
            drawCard(),
            drawCard()
        ];

        blackjackGames.set(interaction.user.id, {
            bet,
            playerCards,
            dealerCards
        });

        const row =
            new ActionRowBuilder().addComponents(

                new ButtonBuilder()
                    .setCustomId('blackjack_hit')
                    .setLabel('🃏 더 뽑기')
                    .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                    .setCustomId('blackjack_stand')
                    .setLabel('✋ 멈추기')
                    .setStyle(ButtonStyle.Secondary)
            );

        return interaction.reply({
            content:
                `🃏 블랙잭 시작!\n\n` +
                `내 카드: ${playerCards.join(', ')}\n` +
                `합계: ${
                    playerCards.reduce((a,b)=>a+b,0)
                }`,
            components: [row]
        });
    }

    if (interaction.commandName === '청소') {

        // 관리자 권한 체크
        if (!interaction.member.permissions.has('ManageMessages')) {

            return interaction.reply({
                content: '❌ 메시지 관리 권한이 없습니다.',
                flags: 64
            });
        }

        const amount =
            interaction.options.getInteger('개수');

        // 1~100 제한
        if (amount < 1 || amount > 100) {

            return interaction.reply({
                content: '❌ 1~100개만 삭제 가능',
                flags: 64
            });
        }

        try {

            // 명령어 메시지 포함 삭제
            await interaction.channel.bulkDelete(amount, true);

            return interaction.reply({
                content: `🧹 ${amount}개 메시지 삭제 완료`,
                flags: 64
            });

        } catch (err) {

            console.error(err);

            return interaction.reply({
                content: '❌ 삭제 실패',
                flags: 64
            });
        }
    }

    if (interaction.commandName === 'ai설정') {

            // 관리자만 가능
            if (!interaction.member.permissions.has('Administrator')) {

                return interaction.reply({
                    content: '❌ 관리자만 사용 가능',
                    flags: 64
                });
            }

            const channel =
                interaction.options.getChannel('채널');

            aiChannelId = channel.id;

            return interaction.reply({
                content:
                    `🤖 AI 채널 설정 완료!\n` +
                    `채널: ${channel}`,
                flags: 64
            });
        }

        if (interaction.commandName === '성격설정') {

        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({
                content: '❌ 관리자만 사용 가능',
                flags: 64
            });
        }

        aiPersonality = interaction.options.getString('프롬프트');

        return interaction.reply({
            content: `🤖 AI 성격 변경 완료!\n\n${aiPersonality}`,
            flags: 64
        });
    }
        


});



client.on('error', console.error);

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});

// AI 대화 채널 ID
client.on('messageCreate', async message => {

    if (message.author.bot) return;
    if (!aiChannelId) return;
    if (message.channel.id !== aiChannelId) return;

    try {

        await message.channel.sendTyping();

        const reply = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: aiPersonality
                },
                {
                    role: "user",
                    content: message.content
                }
            ],
            temperature: 0.7,
            max_tokens: 500
        });

        await message.reply(reply.choices[0].message.content);

    } catch (err) {
        console.error(err);
        await message.reply('❌ AI 오류');
    }
});;

client.login(token);