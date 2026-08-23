import { Hymn } from '../types';

export interface GospelRadio {
  id: string;
  name: string;
  genre: string;
  streamUrl: string;
  coverUrl: string;
  description: string;
  frequency?: string;
}

// Rádios Gospel 100% em Português com Pregação da Palavra e Hinos da Harpa (Streaming direto HTTPS verificado)
export const GOSPEL_RADIOS: GospelRadio[] = [
  {
    id: 'radio_bbn_brasil',
    name: 'Rádio BBN Brasil (Pregação & Hinos Sacros)',
    genre: 'Pregação Expositiva & Hinos da Fé',
    streamUrl: 'https://audio-edge-es6pf.mia.g.radiomast.io/ec065d59-f358-48c9-a288-4efc797e5860',
    coverUrl: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=500&auto=format&fit=crop&q=60',
    description: 'Pregação bíblica expositiva da Palavra de Deus em português, estudos profundos e hinos sacros tradicionais 24h.',
    frequency: 'BBN Nacional 24h'
  },
  {
    id: 'radio_novas_de_paz',
    name: 'Rádio Novas de Paz (Pregação & Harpa)',
    genre: 'Pregação Pentecostal & Harpa Cristã',
    streamUrl: 'https://radio.saopaulo01.com.br/8304/stream',
    coverUrl: 'https://images.unsplash.com/photo-1445307806294-bff7f67ff225?w=500&auto=format&fit=crop&q=60',
    description: 'Pregação da Palavra com unção pentecostal, oração da fé e hinos da Harpa Cristã cantados em português.',
    frequency: 'Novas de Paz'
  },
  {
    id: 'radio_biblia_sbb',
    name: 'Rádio Bíblia SBB (A Palavra & Louvores)',
    genre: 'Palavra de Deus & Hinos Clássicos',
    streamUrl: 'https://servidor30-4.brlogic.com:7398/live',
    coverUrl: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=500&auto=format&fit=crop&q=60',
    description: 'Transmissão da Sociedade Bíblica do Brasil: narração e reflexão da Palavra em português e hinos históricos.',
    frequency: 'SBB Brasil'
  },
  {
    id: 'radio_vida_melhor',
    name: 'Rádio Vida Melhor FM (Mensagens & Louvores)',
    genre: 'Pregação Pastoral & Hinos em Português',
    streamUrl: 'https://servidor32-4.brlogic.com:8480/live',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60',
    description: 'Mensagens pastorais diárias, sermões edificantes e hinos clássicos da Harpa Cristã e adoração.',
    frequency: 'FM 95.7'
  },
  {
    id: 'radio_mgt_gospel',
    name: 'MGT Gospel (Hinos da Fé & Mensagens)',
    genre: 'Harpa Cristã & Corinhos de Fogo',
    streamUrl: 'https://cast.mgtradio.net/radio/8040/aac',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60',
    description: 'Hinos inesquecíveis da Harpa Cristã, corinhos tradicionais e mensagens de fortalecimento espiritual.',
    frequency: 'MGT Gospel'
  },
  {
    id: 'radio_evangelica_calafate',
    name: 'Rádio Evangélica (Pregação & Harpa Viva)',
    genre: 'Pregação Evangelística & Harpa',
    streamUrl: 'https://stm2.radioipbr.com.br:7106/live',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=60',
    description: 'Sermões inspiradores, testemunhos de fé e louvores pentecostais 100% em língua portuguesa.',
    frequency: 'Evangélica 24h'
  },
  {
    id: 'radio_harpa_palavra_viva',
    name: 'Rádio Palavra Viva (Hinos & Estudos)',
    genre: '100% Hinos da Harpa & Pregação',
    streamUrl: 'https://servidor37.brlogic.com:7068/live',
    coverUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=500&auto=format&fit=crop&q=60',
    description: 'Hinos sacros da Harpa Cristã, ministração da Palavra de Deus e estudos bíblicos contínuos.',
    frequency: 'Palavra Viva'
  },
  {
    id: 'radio_shekinah_louvor',
    name: 'Rádio Shekinah (Pregação, Oração & Hinos)',
    genre: 'Pregação, Clamor & Harpa Cristã',
    streamUrl: 'https://player.voxpainel.com.br/proxy/7076',
    coverUrl: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=500&auto=format&fit=crop&q=60',
    description: 'Momentos de oração, ministrações pastorais e os mais belos hinos da Harpa Cristã para a sua vida.',
    frequency: 'Shekinah Ao Vivo'
  }
];

export const HARPA_TITLES_MAP: Record<number, string> = {
  1: 'Chuvas de Graça',
  2: 'Saudosa Lembrança',
  3: 'Plena Paz',
  4: 'Deus Velará por Ti',
  5: 'Ó Desce, Fogo Santo',
  6: 'Na Maldição da Cruz',
  7: 'Cristo Cura, Sim!',
  8: 'Cristo, o Fiel Amigo',
  9: 'Marchai, Soldados de Cristo',
  10: 'Eu Te Louvo',
  15: 'Foi na Cruz (Conversão)',
  16: 'Despertar Para o Trabalho',
  20: 'Olhai Para o Cordeiro de Deus',
  24: 'Dá-me Teu Coração',
  26: 'A Formosa Jerusalém',
  36: 'O Exilado',
  39: 'Alvo Mais que a Neve',
  43: 'Doce Lar Celeste',
  53: 'A Esperança da Igreja',
  73: 'Vinde, Pecadores',
  77: 'Guarda o Contacto',
  84: 'O Grande Eu Sou',
  107: 'Firme nas Promessas',
  115: 'Trabalhai e Orai',
  126: 'Bem-Aventurança do Crente',
  131: 'De Valente Pra Valente',
  141: 'Guia-me Ó Salvador',
  186: 'Dá-me Mais Fé',
  192: 'Pelo Sangue',
  212: 'Os Guerreiros Se Preparam',
  225: 'Sê Valente',
  247: 'Deus Nos Guarde no Seu Amor',
  258: 'Na Rocha Eterna',
  291: 'A Mensagem da Cruz (Rude Cruz)',
  300: 'Nossa Esperança',
  304: 'Um Pendão Real',
  370: 'Mais Perto da Tua Cruz',
  399: 'Descanso em Jesus',
  432: 'Consagrado ao Senhor',
  469: 'Ao Estrugir a Trombeta',
  505: 'As Vitórias de Cristo',
  525: 'Vencendo Vem Jesus',
  545: 'Porque Ele Vive',
  577: 'Em Fervente Oração',
  600: 'A Mão ao Arado',
  640: 'Segura na Mão de Deus'
};

export const HARPA_LYRICS_MAP: Record<number, string> = {
  15: `1. Oh! Quão cego andei e perdido vaguei,
Longe, longe do meu Salvador!
Mas da glória desceu e Seu sangue verteu
Pra salvar um tão pobre pecador.

[CORO]
Foi na cruz, foi na cruz, onde um dia eu vi
Meu pecado castigado em Jesus;
Foi ali, pela fé, que os olhos abri,
E alegre agora vivo no Seu amor!

2. Eu ouvia falar dessa graça sem par,
Que do céu trouxe nosso Jesus;
Mas eu surdo me fiz, converter-me não quis
Ao Senhor, que por mim morreu na cruz.

3. Mas um dia senti meu pecado, e vi
Sobre mim o castigo da lei;
Mas depressa fugi, em Jesus me escondi,
E refúgio seguro n'Ele achei.

4. Oh! Que grande prazer inundou o meu ser,
Pois Jesus me salvou e remiu;
Pelo sangue da cruz, hoje ando na luz,
E meu gozo jamais diminuirá!`,

  545: `1. Deus enviou Seu Filho amado
Para salvar e perdoar;
Na cruz morreu por meu pecado,
Mas ressurgiu e vivo com o Pai está.

[CORO]
Porque Ele vive, posso crer no amanhã,
Porque Ele vive, temor não há;
Mas eu bem sei, eu sei, que a minha vida
Está nas mãos do meu Jesus, que vivo está!

2. E quando, enfim, chegar a hora
Em que a morte enfrentarei,
Sem medo, então, terei vitória:
Verei na glória o meu Jesus, que vivo está!`,

  1: `1. Deus prometeu com certeza
Chuvas de graça mandar;
Ele nos dá fortaleza,
E ricas bênçãos sem par.

[CORO]
Chuvas de graça,
Chuvas pedimos, Senhor;
Manda-nos já, copiosas,
Chuvas de bênçãos e amor!

2. Cristo nos dá a vitória,
O Seu Espírito aqui;
Para louvores da glória,
De quem nos ama sem fim.`,

  39: `1. Bendito seja o Cordeiro,
Que no Calvário morreu!
Bendito seja Seu sangue,
Que por nós todos verteu!

[CORO]
Alvo mais que a neve!
Alvo mais que a neve!
Sim, nesse sangue lavado,
Mais alvo que a neve serei!

2. Se confessarmos pecados,
Cristo nos perdoará;
De toda a nossa impureza,
Com Seu sangue nos lavará.`,

  186: `1. Minha alma, com fé constante,
Busca a Cristo, o Redentor;
Ele é o meu Guia amante,
Meu Amparo e Salvador.

[CORO]
Dá-me mais fé, ó meu Senhor,
Dá-me mais fé no Teu amor!
Dá-me mais fé pra caminhar,
E a Tua glória contemplar!

2. Nas lutas desta jornada,
Sei que Cristo me guardará;
Com Sua mão levantada,
Vitória certa me dará.`,

  192: `1. Pelo sangue, pelo sangue,
Fomos redimidos sim;
Pelo sangue de Jesus,
Que verteu na cruz por mim!

[CORO]
Pelo sangue, sim, pelo sangue,
Tenho paz e salvação;
Pelo sangue de Jesus,
Limpo está meu coração!

2. Não há manchas de pecado
Que não possa purificar;
No bendito sangue d'Ele
Toda alma pode entrar!`,

  291: `1. Rude cruz se erigiu, dela o dia fugiu,
Como emblema de vergonha e dor;
Mas eu amo essa cruz, sobre a qual meu Jesus
Deu a vida por mim, pecador.

[CORO]
Sim, eu amo a mensagem da cruz,
'Té morrer eu a vou proclamar;
Levarei eu também minha cruz,
'Té por uma coroa trocar!

2. Desde a glória dos céus, o Cordeiro de Deus
Ao Calvário humilhado baixou;
Essa cruz tem pra mim atrativos sem fim,
Porque nela Jesus me salvou.`,

  577: `1. Em fervente oração, vem o teu coração
Na presença de Deus derramar;
Mas não podes pedir, nem a bênção fruir,
Se tudo na cruz não deixar.

[CORO]
Tudo no altar já puseste,
Com plena fé e submissão?
Só terás a certeza, a bênção e o poder,
Se tudo deixares no altar!

2. Queres gozo do Céu e do Espírito o dom?
Queres paz inundando teu ser?
Deixa as coisas daqui, dá a Cristo teu ser,
E a glória de Deus hás de ver!`,

  77: `1. Queres, ó crente, saber o segredo
Da vida santa, de paz e poder?
Guarda o contacto com Cristo a toda hora,
E a Sua graça hás de sempre reter.

[CORO]
Guarda o contacto com teu Salvador,
Deixa a luz d'Ele em ti refulgir;
Ganha vitória em Seu santo amor,
E o Seu caminho tu deves seguir!`,

  304: `1. Um pendão real vos entregou o Rei,
A vós, soldados Seus;
Corajosos, pois, em tudo defendei
A marcha para os Céus!

[CORO]
Com valor! Sem temor!
Pelo Rei marchemos nós!
Com amor! Com louvor!
Ergamos nossa voz!`,

  432: `1. Minha posse, meu talento,
Meu descanso, meu labor,
Meu sentir e pensamento,
Consagrei ao meu Senhor.

[CORO]
Consagrado ao Senhor,
Tudo a Ele entreguei;
Para o mundo não sou mais,
Pertencente sou ao Rei!`
};

// Resolução imediata de pesquisa por termo ou número da Harpa Cristã
export const searchHymnsLocally = (query: string): Hymn[] => {
  if (!query || !query.trim()) return [];

  const normalize = (str: string) =>
    str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const normQuery = normalize(query);
  const numberMatch = query.replace(/\D/g, '');
  const results: Hymn[] = [];

  // Se digitou um número (ex: 15, 545, 1, 640)
  if (numberMatch) {
    const num = parseInt(numberMatch, 10);
    if (num >= 1 && num <= 640) {
      const knownTitle = HARPA_TITLES_MAP[num] || `Hino ${num} da Harpa Cristã`;
      const lyrics = HARPA_LYRICS_MAP[num] || `Hino ${num} - ${knownTitle}\n\nHarpa Cristã da Assembleia de Deus\n\nGlória a Deus nas alturas e paz na terra aos homens de boa vontade.\n\nCante e louve ao Senhor com todo o seu coração!`;

      results.push({
        id: `hymn_harpa_${num}`,
        number: num,
        title: knownTitle,
        artist: 'Harpa Cristã (Cantado)',
        category: 'harpa',
        duration: '03:40',
        coverUrl: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=500&auto=format&fit=crop&q=60',
        lyrics: lyrics,
        tags: [String(num), knownTitle.toLowerCase(), 'harpa crista', 'harpa']
      });
    }
  }

  // Verifica títulos conhecidos que casam com o texto digitado
  Object.entries(HARPA_TITLES_MAP).forEach(([numStr, title]) => {
    const num = parseInt(numStr, 10);
    if (normalize(title).includes(normQuery) && !results.some(r => r.number === num)) {
      results.push({
        id: `hymn_harpa_${num}`,
        number: num,
        title: title,
        artist: 'Harpa Cristã (Cantado)',
        category: 'harpa',
        duration: '03:40',
        coverUrl: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=500&auto=format&fit=crop&q=60',
        lyrics: HARPA_LYRICS_MAP[num] || `Hino ${num} - ${title}\n\nHarpa Cristã da Assembleia de Deus\n\nLouve ao Senhor!`,
        tags: [String(num), title.toLowerCase(), 'harpa']
      });
    }
  });

  return results;
};
