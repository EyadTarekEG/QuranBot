console.log("البوت بيشتغل...");

const ffmpegPath = process.env.FFMPEG_PATH || require("ffmpeg-static");
const { spawn } = require("child_process");

const {
Client,
GatewayIntentBits,
ActivityType,
EmbedBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
StringSelectMenuBuilder
} = require("discord.js");

const {
joinVoiceChannel,
createAudioPlayer,
createAudioResource,
AudioPlayerStatus,
VoiceConnectionStatus,
entersState,
StreamType
} = require("@discordjs/voice");

/*==============================*/

const TOKEN = process.env.TOKEN;
const PREFIX = "!";

/*==============================*/

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent,
GatewayIntentBits.GuildVoiceStates
]
});

/*==============================*/
/* القراء */

const READERS = {
mishary:{name:"مشاري العفاسي",flag:"🇰🇼",url:"https://server8.mp3quran.net/afs"},
minshawi:{name:"محمد المنشاوي",flag:"🇪🇬",url:"https://server10.mp3quran.net/minsh"},
sudais:{name:"عبدالرحمن السديس",flag:"🇸🇦",url:"https://server11.mp3quran.net/sds"},
ghamdi:{name:"سعد الغامدي",flag:"🇸🇦",url:"https://server7.mp3quran.net/gmd"},
husary:{name:"محمود الحصري",flag:"🇪🇬",url:"https://server13.mp3quran.net/husary"}
};

const DEFAULT_READER = "minshawi";

/*==============================*/

const activeGuilds = new Map();
const panelMessages = new Map();
const menuPages = new Map();

/*==============================*/

const SURAHS = [
"الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس",
"هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه",
"الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم",
"لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر",
"فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق",
"الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة",
"الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج",
"نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس",
"التكوير","الإنفطار","المطففين","الإنشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد",
"الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات",
"القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر",
"المسد","الإخلاص","الفلق","الناس"
];

/*==============================*/

function getSurahUrl(reader,surah){
const num = String(surah).padStart(3,"0");
return `${READERS[reader].url}/${num}.mp3`;
}

/*==============================*/

function getPageRange(page){

const start = (page - 1) * 25 + 1;
let end = start + 24;

if(end > 114) end = 114;

return {start,end};
}

/*==============================*/

function buildReaderMenu(){

return new ActionRowBuilder().addComponents(
new StringSelectMenuBuilder()
.setCustomId("reader_menu")
.setPlaceholder("🎙️ اختر القارئ")
.addOptions([
{label:"مشاري العفاسي",value:"mishary",emoji:"🇰🇼"},
{label:"محمد المنشاوي",value:"minshawi",emoji:"🇪🇬"},
{label:"عبدالرحمن السديس",value:"sudais",emoji:"🇸🇦"},
{label:"سعد الغامدي",value:"ghamdi",emoji:"🇸🇦"},
{label:"محمود الحصري",value:"husary",emoji:"🇪🇬"}
])
);

}

/*==============================*/

function buildPageMenu(){

return new ActionRowBuilder().addComponents(
new StringSelectMenuBuilder()
.setCustomId("page_menu")
.setPlaceholder("📚 اختر صفحة السور")
.addOptions([
{label:"الصفحة 1 (1-25)",value:"1"},
{label:"الصفحة 2 (26-50)",value:"2"},
{label:"الصفحة 3 (51-75)",value:"3"},
{label:"الصفحة 4 (76-100)",value:"4"},
{label:"الصفحة 5 (101-114)",value:"5"}
])
);

}

/*==============================*/

function buildSurahMenu(guildId){

const page = menuPages.get(guildId) || 1;

const {start,end} = getPageRange(page);

const options = [];

for(let i=start;i<=end;i++){

options.push({
label:SURAHS[i-1],
description:`سورة رقم ${i}`,
value:`surah_${i}`
});

}

return new ActionRowBuilder().addComponents(
new StringSelectMenuBuilder()
.setCustomId("surah_menu")
.setPlaceholder(`📖 اختر سورة (${start}-${end})`)
.addOptions(options)
);

}

/*==============================*/

function buildPanel(guildId){

const guild = activeGuilds.get(guildId);

const playing = !!guild;

const reader = guild ? READERS[guild.reader] : READERS[DEFAULT_READER];

const surah = guild?.surah || 1;

const embed = new EmbedBuilder()
.setColor(playing ? 0x2ecc71 : 0xe67e22)
.setTitle("🕌 بوت القرآن الكريم")
.setDescription(
playing
? `🟢 يعمل الآن

🎙️ القارئ: ${reader.flag} ${reader.name}
📖 السورة: ${SURAHS[surah-1]}`
: `🔴 متوقف

ادخل روم صوتي واضغط تشغيل`
)
.setFooter({text:"Quran Bot"});

const buttons = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("play")
.setLabel("▶️ تشغيل")
.setStyle(ButtonStyle.Success)
.setDisabled(playing),

new ButtonBuilder()
.setCustomId("stop")
.setLabel("⏹️ إيقاف")
.setStyle(ButtonStyle.Danger)
.setDisabled(!playing),

new ButtonBuilder()
.setCustomId("prev")
.setLabel("⏮️ السابق")
.setStyle(ButtonStyle.Secondary)
.setDisabled(!playing),

new ButtonBuilder()
.setCustomId("next")
.setLabel("⏭️ التالي")
.setStyle(ButtonStyle.Secondary)
.setDisabled(!playing)

);

return {
embeds:[embed],
components:[
buttons,
buildReaderMenu(),
buildPageMenu(),
buildSurahMenu(guildId)
]
};

}

/*==============================*/

async function updatePanel(guildId){

const data = panelMessages.get(guildId);
if(!data) return;

try{

const ch = await client.channels.fetch(data.channelId);
const msg = await ch.messages.fetch(data.messageId);

await msg.edit(buildPanel(guildId));

}catch{}

}

/*==============================*/

async function playSurah(connection,reader,guildId,surah){

if(!activeGuilds.has(guildId)) return;

const url = getSurahUrl(reader,surah);

const player = createAudioPlayer();

const ffmpeg = spawn(ffmpegPath,[
"-reconnect","1",
"-reconnect_streamed","1",
"-reconnect_delay_max","5",
"-i",url,
"-vn",
"-c:a","libopus",
"-b:a","128k",
"-f","opus",
"pipe:1"
]);

const resource = createAudioResource(ffmpeg.stdout,{
inputType: StreamType.OggOpus
});

player.play(resource);
connection.subscribe(player);

const guild = activeGuilds.get(guildId);

guild.player = player;
guild.ffmpeg = ffmpeg;
guild.reader = reader;
guild.surah = surah;

updatePanel(guildId);

player.on(AudioPlayerStatus.Idle,()=>{

try{ffmpeg.kill();}catch{}

if(!activeGuilds.has(guildId)) return;

const next = surah >= 114 ? 1 : surah + 1;

playSurah(connection,reader,guildId,next);

});

}

/*==============================*/

client.once("clientReady",()=>{

console.log(`✅ ${client.user.tag}`);

client.user.setActivity("القرآن الكريم",{
type: ActivityType.Listening
});

});

/*==============================*/

client.on("interactionCreate",async interaction=>{

const guildId = interaction.guild.id;
const guild = activeGuilds.get(guildId);

/* Buttons */

if(interaction.isButton()){

await interaction.deferUpdate();

const id = interaction.customId;

if(id === "play"){

if(guild) return;

const vc = interaction.member.voice.channel;

if(!vc){
return interaction.followUp({
content:"❌ ادخل روم صوتي",
ephemeral:true
});
}

const connection = joinVoiceChannel({
channelId: vc.id,
guildId,
adapterCreator: interaction.guild.voiceAdapterCreator,
selfDeaf:false
});

await entersState(connection,VoiceConnectionStatus.Ready,10000);

activeGuilds.set(guildId,{
connection,
player:null,
ffmpeg:null,
reader:DEFAULT_READER,
surah:1
});

playSurah(connection,DEFAULT_READER,guildId,1);

}

else if(id === "stop"){

if(!guild) return;

try{guild.ffmpeg.kill();}catch{}
try{guild.connection.destroy();}catch{}

activeGuilds.delete(guildId);
updatePanel(guildId);

}

else if(id === "next"){

if(!guild) return;

try{
guild.ffmpeg.kill();
guild.player.stop();
}catch{}

const next = guild.surah >= 114 ? 1 : guild.surah + 1;

playSurah(guild.connection,guild.reader,guildId,next);

}

else if(id === "prev"){

if(!guild) return;

try{
guild.ffmpeg.kill();
guild.player.stop();
}catch{}

const prev = guild.surah <= 1 ? 114 : guild.surah - 1;

playSurah(guild.connection,guild.reader,guildId,prev);

}

}

/* Select Menus */

else if(interaction.isStringSelectMenu()){

await interaction.deferUpdate();

if(interaction.customId === "page_menu"){

menuPages.set(guildId,Number(interaction.values[0]));
updatePanel(guildId);
return;
}

if(!guild) return;

if(interaction.customId === "reader_menu"){

const newReader = interaction.values[0];

try{
guild.ffmpeg.kill();
guild.player.stop();
}catch{}

playSurah(
guild.connection,
newReader,
guildId,
guild.surah
);

}

else if(interaction.customId === "surah_menu"){

const num = Number(
interaction.values[0].replace("surah_","")
);

try{
guild.ffmpeg.kill();
guild.player.stop();
}catch{}

playSurah(
guild.connection,
guild.reader,
guildId,
num
);

}

}

});

/*==============================*/

client.on("messageCreate",async message=>{

if(message.author.bot) return;
if(!message.content.startsWith(PREFIX)) return;

const cmd = message.content.slice(1).trim().toLowerCase();

if(cmd === "panel"){

menuPages.set(message.guild.id,1);

const sent = await message.channel.send(
buildPanel(message.guild.id)
);

panelMessages.set(message.guild.id,{
channelId:message.channel.id,
messageId:sent.id
});

}

});

/*==============================*/

process.on("uncaughtException",console.error);
process.on("unhandledRejection",console.error);

client.login(TOKEN);
