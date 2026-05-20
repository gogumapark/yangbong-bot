const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Bot is alive');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});

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
const isDraw = game.board.every(cell => cell !== null);

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
        .setName('소개')
        .setDescription('안녕 날 소개하지'),

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
    .setDescription('유저정보를 확인합니다'),

    new SlashCommandBuilder()
    .setName('틱택토')
    .setDescription('틱택토 게임을 시작합니다'),
    
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

client.once('ready', () => {
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


client.on('interactionCreate', async interaction => {

    if (!interaction.isChatInputCommand()) return;

    // /핑
    if (interaction.commandName === '안녕') {
        await interaction.reply('인사 똑바로해라.');
    }

    // /주사위
    if (interaction.commandName === '주사위') {

        const dice = Math.floor(Math.random() * 6) + 1;

        await interaction.reply(`🎲 금나와라 뚝딱!! : ${dice}`);
    }

    if (interaction.commandName === '운세') {

       const userId = interaction.user.id;

        const today =
            new Date().toLocaleDateString();

        // 하루 1번 제한
        if (userFortunes[userId] === today) {

            return interaction.reply({
                content: '❌ 하루에 한번만~',
                ephemeral: true
            });
        }

    // 오늘 날짜 저장
    userFortunes[userId] = today;


    const fortunes = [
        '🍀 오늘의 당신은 럭키가이!!',
        '🔥 타올라라 열정이여!! 오늘은 성공의 느낌',
        '💤 푹 쉬어라...',
        '💰 왜인지 뜻밖의 행운이?!',
        '💻 게임하자 오늘은 그래도 돼.',
        '📙 공부나 해라....',
        '⚡ 안좋은일이 있을수도..',
        '💚 연애운 급 상승~!'
    ];


        const random =
            fortunes[Math.floor(Math.random() * fortunes.length)];

        await interaction.reply(
            `🔮 오늘의 운세\n\n${random}`
        );

    }

    if (interaction.commandName === '소개') {

        const embed = new EmbedBuilder()
            .setTitle('🐝 양봉이')
            .setDescription(
                '안녕 날 소개하지 난 양봉장의 전용 봇 양봉이라고 하오'
            )
            .setColor('Green')
            .setThumbnail(
                'https://cdn.discordapp.com/attachments/1110460136373366845/1506536312423841873/image.png?ex=6a0e9ec6&is=6a0d4d46&hm=df046c8c3c4fd195fbe36ebaa666f13d010f5be1b03090e878b5b53b8276c237&'
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
            ephemeral: true
        });

    }

    const amount =
        interaction.options.getInteger('개수');

    // 1~100 제한
    if (amount < 1 || amount > 100) {

        return interaction.reply({
            content: '❌ 1~100개만 삭제 가능함 ㅇㅇ.;;;',
            ephemeral: true
        });

    }

    await interaction.channel.bulkDelete(amount, true);

    await interaction.reply({
        content: `🧹 메시지 ${amount}개 삭제 완료!`,
        ephemeral: true
    });

}

if (interaction.commandName === '삭제로그') {

    const data =
        deletedMessages.get(interaction.channel.id);

    if (!data) {

        return interaction.reply({
            content: '❌ 최근 삭제된 메시지가 없다!',
            ephemeral: true
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

    const user = interaction.user;
    const member = interaction.member;

    const embed = new EmbedBuilder()
        .setTitle('👤 유저 정보')
        .setThumbnail(user.displayAvatarURL())
        .addFields(
            { name: '이름', value: user.username, inline: true },
            { name: 'ID', value: user.id, inline: true },
            { name: '서버 닉네임', value: member.nickname || '없음', inline: true },
            { name: '가입일', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` }
        )
        .setColor('Blue');

    await interaction.reply({ embeds: [embed] });
}


if (interaction.commandName === '틱택토') {

    const gameId = interaction.id;

    tttGames.set(gameId, {
        board: Array(9).fill(null),
        turn: '❌'
    });

    await interaction.reply({
        content: '🎮 틱택토 시작! ❌ 먼저',
        components: createBoard(gameId)
    });
}


});

client.on('interactionCreate', async interaction => {

    if (!interaction.isButton()) return;

    if (!interaction.customId.startsWith('ttt_')) return;

    const [, gameId, index] = interaction.customId.split('_');
    const game = tttGames.get(gameId);

    if (!game) return;

    if (game.board[index]) {
        return interaction.reply({
            content: '이미 선택된 칸임',
            ephemeral: true
        });
    }

    game.board[index] = game.turn;

    // 승리 체크
    const winPatterns = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
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

// 💥 무승부 체크 (핵심)
const isDraw = game.board.every(cell => cell !== null);

if (isDraw) {
    tttGames.delete(gameId);

    return interaction.update({
        content: `🤝 무승부! 더 이상 진행할 수 없음`,
        components: []
    });
}

    // 턴 변경
    game.turn = game.turn === '❌' ? '⭕' : '❌';

    await interaction.update({
        content: `현재 턴: ${game.turn}`,
        components: createBoard(gameId)
    });
});

client.login(token);

const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Bot is running');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Web server running on port ${PORT}`);
});