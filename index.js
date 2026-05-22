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

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB 연결 성공!'))
    .catch(err => console.error('MongoDB 연결 실패:', err));

    const moneySchema = new mongoose.Schema({
        userId: { type: String, unique: true },
        money: { type: Number, default: 1000 },

        lastFortuneDate: { type: String, default: null },
        fortuneStreak: { type: Number, default: 0 },

        begCount: { type: Number, default: 0 },
        lastBegDate: { type: String, default: null },

        stocks: {
            type: Map,
            of: Number,
            default: {}
        }
    });

    const stockSchema = new mongoose.Schema({
        name: { type: String, unique: true },
        owner: String,
        price: { type: Number, default: 100 },
        listed: { type: Boolean, default: true }
    });

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
    ButtonStyle
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
        .setName('상장폐지')
        .setDescription('회사를 상장 폐지합니다')
        .addStringOption(option =>
            option
                .setName('회사')
                .setDescription('회사 이름')
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
        .addIntegerOption(option =>
            option
                .setName('금액')
                .setDescription('배팅할 금액')
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
    const stocks = await Stock.find();

    for (let stock of stocks) {
        if (!stock.listed) continue;

        const change = (Math.random() - 0.5) * 20; 
        stock.price = Math.max(1, Math.floor(stock.price + change));

        if (stock.price < 1) stock.price = 1;

        await stock.save();
    }
}, 600000);


client.on('interactionCreate', async interaction => {

   try {

        // 버튼 처리
        if (interaction.isButton()) {

            // =========================
            // 편지 열기
            // =========================
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

            // =========================
            // 편지 페이지 이동
            // =========================
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

            // =========================
            // 편지 삭제
            // =========================
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

            // =========================
            // 틱택토
            // =========================
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
            return interaction.editReply('❌ 하루에 한번씩~.');
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
                '안녕 날 소개하지 난 양봉장의 전용 봇 양봉이라고 하오'
            )
            .setColor('Green')
            .setThumbnail(
                'https://cdn.discordapp.com/attachments/1110460136373366845/1506536312423841873/image.png?ex=6a0e9ec6&is=6a0d4d46&hm=df046c8c3c4fd195fbe36ebaa666f13d010f5be1b03090e878b5b53b8276c237&'
            )
            .addFields(
                { name: '📜 명령어 목록', value: '  ' },

                { name: '도움말 - 양봉이의 도움말을 확인합니다.', value: '/도움말' },
                { name: '삭제로그 - 최근 삭제된 메시지를 확인합니다.', value: '/삭제로그' },
                { name: '안녕 - 양봉이에게 인사해보세요', value: '/안녕' },
                { name: '운세 - 오늘의 운세를 알려줍니다.', value: '/운세' },
                { name: '유저 정보 - 유저정보를 확인합니다.', value: '/유저정보  유저:' },
                { name: '주사위 - 주사위를 굴립니다.', value: '/주사위' },
                { name: '청소 - 메시지를 삭제합니다.', value: '/청소 개수: 1 ~ 100' },
                { name: '틱택토 - 틱택토!!.', value: '/틱택토' },
                { name: '편지 - 유저에게 편지를 보냅니다.', value: '/편지 유저: 종류: 내용:' },
                { name: '편지함 - 받은 편지를 확인합니다.', value: '/편지함' }
            )

            .setFooter({
                text: '양봉장의 전용 봇, 아이스크림을 굉장히 좋아한다.'
            });

        await interaction.reply({
            embeds: [embed]
        });

    }

    if (interaction.commandName === '청소') {

        // 관리자 권한 체크
        if (!interaction.member.permissions.has('ManageMessages')) {

            return interaction.reply({
                content: '❌ 메시지 관리 권한 없잖아!',
                flags: 64
            });

        }

        const amount =
            interaction.options.getInteger('개수');

        // 1~100 제한
        if (amount < 1 || amount > 100) {

            return interaction.reply({
                content: '❌ 1~100개만 삭제 가능함 ㅇㅇ.;;;',
                flags: 64
            });

        }

        await interaction.channel.bulkDelete(amount, true);

        await interaction.reply({
            content: `🧹 메시지 ${amount}개 삭제 완료!`,
            flags: 64
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
        const bet = interaction.options.getInteger('금액');

        const user = await getUser(userId);

        if (bet <= 0) {
            return interaction.reply({
                content: '❌ 1원 이상 걸어라',
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

        const name = interaction.options.getString('이름');

        const exists = await Stock.findOne({ name });

        if (exists) {
            return interaction.editReply('이미 존재하는 회사입니다.');
        }

        // 🔥 유저 회사 개수 체크
        const myCompanies = await Stock.countDocuments({
            owner: interaction.user.id
        });

        if (myCompanies >= 2) {
            return interaction.editReply('❌ 회사는 최대 2개까지 생성 가능합니다!');
        }

        await Stock.create({
            name,
            owner: interaction.user.id,
            price: 100
        });

        return interaction.editReply(
            `🏢 ${name} 회사 생성 완료! (가격: 100원)`
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

        return interaction.editReply(`💰 ${name} ${qty}주 매도 완료`);
    }

        if (interaction.commandName === '상장폐지') {
            await interaction.deferReply();

            const name = interaction.options.getString('회사');

            const stock = await Stock.findOne({ name });
            if (!stock) return interaction.editReply('없음');

            stock.listed = false;
            stock.price = 0;
            await stock.save();

            return interaction.editReply(`💀 ${name} 상장폐지되었습니다. 바이바이 휴지조각`);
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


    if (interaction.commandName === '구걸') {

        await interaction.deferReply({ flags: 64 });

        const user = await getUser(interaction.user.id);

        const today = new Date().toLocaleDateString('sv-SE', {
            timeZone: 'Asia/Seoul'
        });

        // 날짜 바뀌면 초기화
        if (user.lastBegDate !== today) {
            user.lastBegDate = today;
            user.begCount = 0;
        }

        // 하루 3번 제한
        if (user.begCount >= 3) {
            return interaction.editReply(
                '❌ㅣ에라이 거지야 세번이상은 안된다!!'
            );
        }

        user.begCount += 1;
        user.money += 500;

        await user.save();

        return interaction.editReply(
            `🪙 500원을 구걸했다!\n` +
            `📅 오늘 구걸 횟수: ${user.begCount}/3\n` +
            `💰 현재 돈: ${user.money}원`
        );
    }


});



client.on('error', console.error);

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});



client.login(token);