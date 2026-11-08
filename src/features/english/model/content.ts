/**
 * Conteúdo local do painel de inglês (sem rede): uma palavra ou expressão por
 * dia e uma frase para praticar. A escolha é determinística pela data, então
 * todo mundo vê o mesmo item no mesmo dia e nada precisa ser guardado.
 */
export type Level = "basic" | "mid" | "advanced";
export type Theme = "geral" | "trabalho" | "tech" | "viagem";
export type Word = { en: string; pt: string; example: string; level: Level; theme: Theme };
export type Phrase = { en: string; pt: string; level: Level; theme: Theme };

type RawWord = Pick<Word, "en" | "pt" | "example">;
type RawPhrase = Pick<Phrase, "en" | "pt">;

export const levels: { id: Level; name: string }[] = [
  { id: "basic", name: "Básico" },
  { id: "mid", name: "Intermediário" },
  { id: "advanced", name: "Avançado" },
];
export const themes: { id: Theme; name: string }[] = [
  { id: "geral", name: "Geral" },
  { id: "trabalho", name: "Trabalho" },
  { id: "tech", name: "Programação" },
  { id: "viagem", name: "Viagem" },
];

const baseWords: RawWord[] = [
  { en: "to figure out", pt: "descobrir, entender", example: "I finally figured out why the build was failing." },
  { en: "to look into", pt: "investigar", example: "I'll look into that bug this afternoon." },
  { en: "to come up with", pt: "ter uma ideia, bolar", example: "She came up with a clever solution." },
  { en: "to run into", pt: "esbarrar em, encontrar por acaso", example: "I ran into an old friend at the conference." },
  { en: "to put off", pt: "adiar", example: "Don't put off the review until Friday." },
  { en: "to carry out", pt: "executar, realizar", example: "We carried out the migration over the weekend." },
  { en: "to follow up", pt: "dar seguimento", example: "I'll follow up with you after the meeting." },
  { en: "to sort out", pt: "resolver, organizar", example: "Let's sort out the details tomorrow." },
  { en: "to set up", pt: "configurar, montar", example: "It took an hour to set up the project." },
  { en: "to break down", pt: "dividir em partes; quebrar", example: "Let's break the task down into smaller steps." },
  { en: "to keep track of", pt: "acompanhar, manter o controle", example: "I use a notebook to keep track of my tasks." },
  { en: "to catch up", pt: "pôr em dia", example: "I need to catch up on my emails." },
  { en: "to wrap up", pt: "concluir, encerrar", example: "Let's wrap up the meeting in five minutes." },
  { en: "to roll out", pt: "lançar gradualmente", example: "They rolled out the feature to ten percent of users." },
  { en: "to deal with", pt: "lidar com", example: "I have to deal with a lot of legacy code." },
  { en: "workaround", pt: "solução alternativa, gambiarra", example: "There's a workaround until the fix is released." },
  { en: "bottleneck", pt: "gargalo", example: "The database is the bottleneck." },
  { en: "trade-off", pt: "troca, compromisso entre vantagens e custos", example: "Every design has a trade-off." },
  { en: "deadline", pt: "prazo final", example: "The deadline is next Thursday." },
  { en: "feedback", pt: "retorno, opinião sobre o trabalho", example: "I'd love your feedback on this draft." },
  { en: "outcome", pt: "resultado", example: "The outcome was better than expected." },
  { en: "overwhelmed", pt: "sobrecarregado", example: "I felt overwhelmed by the amount of work." },
  { en: "reliable", pt: "confiável", example: "We need a more reliable way to deploy." },
  { en: "thoroughly", pt: "minuciosamente", example: "Please test it thoroughly before merging." },
  { en: "eventually", pt: "com o tempo, por fim (não 'eventualmente')", example: "Eventually, we moved everything to the cloud." },
  { en: "actually", pt: "na verdade (não 'atualmente')", example: "Actually, the meeting is at three." },
  { en: "currently", pt: "atualmente", example: "I'm currently working on the search feature." },
  { en: "to pull off", pt: "conseguir realizar algo difícil", example: "I can't believe we pulled it off." },
  { en: "to be up to speed", pt: "estar atualizado", example: "Can you get me up to speed on the project?" },
  { en: "heads up", pt: "aviso antecipado", example: "Just a heads up: the server will restart at noon." },
  { en: "on the same page", pt: "alinhados, de acordo", example: "Let's make sure we're all on the same page." },
  { en: "a piece of cake", pt: "moleza, muito fácil", example: "The exam was a piece of cake." },
  { en: "to hit the ground running", pt: "começar a todo vapor", example: "She hit the ground running on her first day." },
  { en: "the bottom line", pt: "o ponto principal, o resultado final", example: "The bottom line is that we need more time." },
  { en: "out of the blue", pt: "do nada, de repente", example: "He called me out of the blue." },
  { en: "to take it for granted", pt: "dar como certo, não valorizar", example: "Don't take good tests for granted." },
  { en: "once in a while", pt: "de vez em quando", example: "I eat out once in a while." },
  { en: "sooner or later", pt: "mais cedo ou mais tarde", example: "Sooner or later, you'll have to refactor this." },
  { en: "to keep an eye on", pt: "ficar de olho em", example: "Keep an eye on the logs tonight." },
  { en: "to get the hang of", pt: "pegar o jeito de", example: "I'm getting the hang of TypeScript." },
  { en: "to be about to", pt: "estar prestes a", example: "I was about to leave when you called." },
  { en: "to be supposed to", pt: "dever, era para", example: "The build is supposed to take two minutes." },
  { en: "to end up", pt: "acabar (fazendo/ficando)", example: "We ended up rewriting the whole module." },
  { en: "no matter what", pt: "aconteça o que acontecer", example: "Ship it on Friday, no matter what." },
  { en: "as far as I know", pt: "até onde eu sei", example: "As far as I know, the API hasn't changed." },
  { en: "to be in charge of", pt: "ser responsável por", example: "She's in charge of the release process." },
  { en: "at the end of the day", pt: "no fim das contas", example: "At the end of the day, users want it to be fast." },
  { en: "to make sense", pt: "fazer sentido", example: "Your explanation makes sense to me." },
  { en: "to rule out", pt: "descartar", example: "We ruled out a network problem." },
  { en: "to double-check", pt: "conferir de novo", example: "Let me double-check the numbers." },
  { en: "to get rid of", pt: "se livrar de", example: "We should get rid of this old dependency." },
  { en: "to take care of", pt: "cuidar de, resolver", example: "I'll take care of the deployment." },
  { en: "to give up", pt: "desistir", example: "Don't give up, you're almost there." },
  { en: "to give it a shot", pt: "tentar, dar uma chance", example: "Let's give it a shot and see what happens." },
  { en: "to bring up", pt: "levantar um assunto", example: "She brought up a good point in the meeting." },
  { en: "to look forward to", pt: "aguardar com expectativa", example: "I'm looking forward to the weekend." },
  { en: "to get used to", pt: "acostumar-se a", example: "I'm getting used to the new keyboard." },
  { en: "to figure something out the hard way", pt: "aprender na marra", example: "I learned about backups the hard way." },
  { en: "a learning curve", pt: "curva de aprendizado", example: "Rust has a steep learning curve." },
  { en: "to be fed up with", pt: "estar farto de", example: "I'm fed up with slow builds." },
  { en: "to stick to", pt: "manter-se fiel a, seguir", example: "Let's stick to the plan." },
  { en: "to call it a day", pt: "encerrar o expediente", example: "It's late, let's call it a day." },
];

const basePhrases: RawPhrase[] = [
  { en: "Could you say that again, please?", pt: "Pode repetir, por favor?" },
  { en: "I'm not sure I understand what you mean.", pt: "Não tenho certeza de que entendi o que você quer dizer." },
  { en: "Let me think about it and get back to you.", pt: "Deixa eu pensar e te dou um retorno." },
  { en: "I'd like to ask a quick question.", pt: "Gostaria de fazer uma pergunta rápida." },
  { en: "Sorry, I didn't catch that.", pt: "Desculpe, não entendi (não ouvi direito)." },
  { en: "Can you walk me through the process?", pt: "Pode me explicar o processo passo a passo?" },
  { en: "I'm working on a new feature this week.", pt: "Estou trabalhando numa funcionalidade nova esta semana." },
  { en: "The deployment went smoothly yesterday.", pt: "O deploy correu tranquilo ontem." },
  { en: "We found a bug in the login page.", pt: "Encontramos um bug na página de login." },
  { en: "Could you review my pull request when you have time?", pt: "Pode revisar meu pull request quando tiver tempo?" },
  { en: "I think we should split this into two tasks.", pt: "Acho que deveríamos dividir isso em duas tarefas." },
  { en: "It works on my machine, but not in production.", pt: "Funciona na minha máquina, mas não em produção." },
  { en: "I'll send you the details by email.", pt: "Vou te mandar os detalhes por e-mail." },
  { en: "What do you think is the best approach?", pt: "Qual você acha que é a melhor abordagem?" },
  { en: "I have been learning English for a few months.", pt: "Estou aprendendo inglês há alguns meses." },
  { en: "Practice makes perfect.", pt: "A prática leva à perfeição." },
  { en: "I would rather work in the morning.", pt: "Prefiro trabalhar de manhã." },
  { en: "She asked me whether I had finished the report.", pt: "Ela me perguntou se eu tinha terminado o relatório." },
  { en: "If I had more time, I would learn another language.", pt: "Se eu tivesse mais tempo, aprenderia outra língua." },
  { en: "I've been looking for a solution for hours.", pt: "Estou procurando uma solução há horas." },
  { en: "Nice to meet you. I've heard a lot about you.", pt: "Prazer em conhecer. Ouvi falar muito de você." },
  { en: "Could we reschedule the meeting for tomorrow?", pt: "Podemos remarcar a reunião para amanhã?" },
  { en: "I'm sorry for the late reply.", pt: "Desculpe a demora na resposta." },
  { en: "Thanks for your patience.", pt: "Obrigado pela paciência." },
  { en: "I'm going to grab a coffee. Do you want anything?", pt: "Vou pegar um café. Quer algo?" },
  { en: "The weather is nicer than I expected.", pt: "O tempo está melhor do que eu esperava." },
  { en: "Where can I find the documentation?", pt: "Onde posso encontrar a documentação?" },
  { en: "It depends on what you're trying to achieve.", pt: "Depende do que você está tentando alcançar." },
  { en: "I'm used to working remotely.", pt: "Estou acostumado a trabalhar remotamente." },
  { en: "Let's take a short break and come back in ten minutes.", pt: "Vamos fazer uma pausa curta e voltar em dez minutos." },
  { en: "The more I practice, the more confident I feel.", pt: "Quanto mais eu pratico, mais confiante me sinto." },
  { en: "I didn't expect it to be so easy.", pt: "Não esperava que fosse tão fácil." },
  { en: "Can I get your opinion on this design?", pt: "Posso ter sua opinião sobre este design?" },
  { en: "He told me he would call me back later.", pt: "Ele disse que me ligaria mais tarde." },
  { en: "I'll be there in five minutes.", pt: "Chego aí em cinco minutos." },
  { en: "Thank you so much for your help.", pt: "Muito obrigado pela ajuda." },
  { en: "Could you speak a little more slowly?", pt: "Pode falar um pouco mais devagar?" },
  { en: "I can read English well, but speaking is harder.", pt: "Leio bem em inglês, mas falar é mais difícil." },
];

/* O conteúdo acima é intermediário; estas listas trazem os outros níveis e temas. */
const techWords = new Set([
  "workaround", "bottleneck", "trade-off", "to set up", "to roll out",
  "to break down", "to rule out", "a learning curve", "to double-check", "to get rid of",
]);
const workWords = new Set([
  "deadline", "feedback", "to follow up", "to wrap up", "on the same page",
  "to be in charge of", "to be up to speed", "heads up", "to call it a day",
  "the bottom line", "outcome", "to carry out", "to bring up", "at the end of the day",
]);
const techPhrases = /bug|deploy|production|pull request|machine|documentation|design|task|feature/i;
const workPhrases = /meeting|reply|email|reschedul|patience|opinion/i;

const intermediateWords: Word[] = baseWords.map((word) => ({
  ...word,
  level: "mid",
  theme: techWords.has(word.en) ? "tech" : workWords.has(word.en) ? "trabalho" : "geral",
}));
const intermediatePhrases: Phrase[] = basePhrases.map((phrase) => ({
  ...phrase,
  level: "mid",
  theme: techPhrases.test(phrase.en) ? "tech" : workPhrases.test(phrase.en) ? "trabalho" : "geral",
}));

const w = (level: Level, theme: Theme, en: string, pt: string, example: string): Word => ({ en, pt, example, level, theme });
const p = (level: Level, theme: Theme, en: string, pt: string): Phrase => ({ en, pt, level, theme });

const extraWords: Word[] = [
  // Básico · geral
  w("basic", "geral", "to wake up", "acordar", "I wake up at seven every day."),
  w("basic", "geral", "to get on / to get off", "subir em / descer de (transporte)", "I get off the bus at the next stop."),
  w("basic", "geral", "to turn on / to turn off", "ligar / desligar", "Please turn off the lights."),
  w("basic", "geral", "to pick up", "pegar, buscar", "I'll pick you up at eight."),
  w("basic", "geral", "to find out", "descobrir, ficar sabendo", "I found out the store is closed."),
  w("basic", "geral", "to hang out", "passar tempo com amigos", "We usually hang out on Saturdays."),
  w("basic", "geral", "to work out", "malhar; dar certo", "Everything worked out in the end."),
  w("basic", "geral", "to show up", "aparecer, comparecer", "He didn't show up to the party."),
  w("basic", "geral", "to cheer up", "animar-se", "Cheer up, it's not that bad."),
  w("basic", "geral", "recently", "recentemente", "I recently started a new course."),
  w("basic", "geral", "enough", "suficiente", "I don't have enough time today."),
  w("basic", "geral", "although", "embora", "Although it was late, we kept working."),
  w("basic", "geral", "however", "no entanto", "I like it. However, it's too expensive."),
  w("basic", "geral", "instead of", "em vez de", "I drank tea instead of coffee."),
  w("basic", "geral", "on purpose", "de propósito", "I didn't break it on purpose."),
  w("basic", "geral", "by the way", "a propósito", "By the way, did you call her?"),
  // Básico · viagem
  w("basic", "viagem", "boarding pass", "cartão de embarque", "Please show your boarding pass at the gate."),
  w("basic", "viagem", "luggage", "bagagem", "My luggage didn't arrive."),
  w("basic", "viagem", "to check in", "fazer check-in", "We checked in two hours early."),
  w("basic", "viagem", "delay", "atraso", "There is a one-hour delay."),
  w("basic", "viagem", "directions", "indicações de caminho", "Could you give me directions to the station?"),
  w("basic", "viagem", "nearby", "por perto", "Is there a pharmacy nearby?"),
  w("basic", "viagem", "receipt", "recibo, nota fiscal", "Can I have the receipt, please?"),
  w("basic", "viagem", "refund", "reembolso", "I'd like a refund for this ticket."),
  w("basic", "viagem", "to get around", "locomover-se", "It's easy to get around by subway."),
  w("basic", "viagem", "to book", "reservar", "I booked a table for two."),
  w("basic", "viagem", "fare", "tarifa da passagem", "The fare is three dollars."),
  w("basic", "viagem", "tip", "gorjeta; dica", "Do I need to leave a tip?"),
  // Intermediário · trabalho
  w("mid", "trabalho", "to touch base", "dar um alô, alinhar rapidamente", "Let's touch base on Monday."),
  w("mid", "trabalho", "to circle back", "retomar depois", "I'll circle back to this after lunch."),
  w("mid", "trabalho", "to push back", "contestar, resistir a um pedido", "I had to push back on the deadline."),
  w("mid", "trabalho", "off the top of my head", "de cabeça, sem checar", "Off the top of my head, it's about ten."),
  w("mid", "trabalho", "ballpark figure", "estimativa aproximada", "Can you give me a ballpark figure?"),
  w("mid", "trabalho", "stakeholder", "parte interessada", "We need to inform every stakeholder."),
  w("mid", "trabalho", "to onboard", "integrar (novo membro, usuário)", "We onboard new hires in their first week."),
  w("mid", "trabalho", "in hindsight", "em retrospecto", "In hindsight, we should have tested more."),
  w("mid", "trabalho", "to bite the bullet", "encarar algo difícil de uma vez", "I decided to bite the bullet and ask for a raise."),
  w("mid", "trabalho", "to cut corners", "fazer nas coxas, economizar no essencial", "Don't cut corners on security."),
  w("mid", "trabalho", "scope creep", "crescimento descontrolado do escopo", "Scope creep delayed the whole project."),
  w("mid", "trabalho", "to take ownership", "assumir a responsabilidade", "She took ownership of the incident."),
  // Intermediário · tech
  w("mid", "tech", "edge case", "caso extremo, situação rara", "We forgot to handle that edge case."),
  w("mid", "tech", "boilerplate", "código repetitivo padrão", "The template removes a lot of boilerplate."),
  w("mid", "tech", "to ship", "lançar, entregar", "We ship every other Friday."),
  w("mid", "tech", "to roll back", "reverter", "We had to roll back the release."),
  w("mid", "tech", "to scale", "escalar, crescer em capacidade", "The service doesn't scale well."),
  w("mid", "tech", "regression", "regressão (algo que parou de funcionar)", "The last update caused a regression."),
  w("mid", "tech", "to nitpick", "implicar com detalhes", "Sorry to nitpick, but there's a typo."),
  w("mid", "tech", "to hand off", "passar o bastão", "I'll hand the task off to Maria."),
  w("mid", "tech", "to flag", "sinalizar, marcar", "Please flag anything that looks odd."),
  w("mid", "tech", "to revert", "desfazer um commit", "Let's revert that commit."),
  w("mid", "tech", "to dig into", "investigar a fundo", "I'll dig into the logs tomorrow."),
  w("mid", "tech", "to hack together", "montar às pressas", "I hacked together a quick prototype."),
  // Avançado
  w("advanced", "geral", "to hinge on", "depender de, girar em torno de", "The decision hinges on the budget."),
  w("advanced", "geral", "to gloss over", "passar por cima de, tratar superficialmente", "The report glosses over the main risks."),
  w("advanced", "geral", "to alleviate", "aliviar", "This change should alleviate the pressure."),
  w("advanced", "geral", "unprecedented", "sem precedentes", "The growth was unprecedented."),
  w("advanced", "geral", "to mitigate", "mitigar, reduzir o impacto", "We added alerts to mitigate the risk."),
  w("advanced", "geral", "ambiguous", "ambíguo", "The requirements are ambiguous."),
  w("advanced", "geral", "to be hit or miss", "ser irregular, às vezes funciona", "The new tool is a bit hit or miss."),
  w("advanced", "geral", "caveat", "ressalva", "One caveat: it only works offline."),
  w("advanced", "geral", "whereas", "enquanto (contraste)", "He prefers mornings, whereas I work best at night."),
  w("advanced", "geral", "to be bound to", "estar fadado a", "Without tests, bugs are bound to appear."),
  w("advanced", "trabalho", "to leverage", "aproveitar, usar como vantagem", "We can leverage our existing tools."),
  w("advanced", "trabalho", "to streamline", "simplificar, tornar mais eficiente", "We streamlined the approval process."),
  w("advanced", "trabalho", "to be accountable for", "responder por", "Each owner is accountable for their service."),
  w("advanced", "tech", "technical debt", "dívida técnica", "Skipping tests adds technical debt."),
  w("advanced", "tech", "to deprecate", "marcar como obsoleto", "They deprecated the old endpoint."),
  w("advanced", "tech", "race condition", "condição de corrida", "A race condition caused the flaky test."),
  w("advanced", "tech", "idempotent", "idempotente (repetir não muda o resultado)", "The request must be idempotent."),
  w("advanced", "tech", "to bikeshed", "discutir detalhes triviais", "Let's not bikeshed about naming."),
  w("advanced", "tech", "to refactor", "refatorar", "We should refactor this module first."),
  w("advanced", "tech", "brittle", "frágil", "These tests are brittle."),
];

const extraPhrases: Phrase[] = [
  // Básico
  p("basic", "geral", "How are you doing today?", "Como você está hoje?"),
  p("basic", "geral", "I'm learning English.", "Estou aprendendo inglês."),
  p("basic", "geral", "Could you help me, please?", "Pode me ajudar, por favor?"),
  p("basic", "geral", "What time is it?", "Que horas são?"),
  p("basic", "geral", "I don't understand.", "Não entendi."),
  p("basic", "geral", "How do you say this in English?", "Como se diz isso em inglês?"),
  p("basic", "geral", "I'd like a glass of water, please.", "Gostaria de um copo d'água, por favor."),
  p("basic", "geral", "See you tomorrow.", "Até amanhã."),
  p("basic", "geral", "I have lived here for three years.", "Moro aqui há três anos."),
  p("basic", "geral", "It's a pleasure to meet you.", "É um prazer te conhecer."),
  p("basic", "viagem", "Where is the nearest subway station?", "Onde fica a estação de metrô mais próxima?"),
  p("basic", "viagem", "How much does this cost?", "Quanto custa isso?"),
  p("basic", "viagem", "I have a reservation under the name Lucas.", "Tenho uma reserva no nome de Lucas."),
  p("basic", "viagem", "Could we have the check, please?", "Pode trazer a conta, por favor?"),
  p("basic", "viagem", "My flight has been delayed.", "Meu voo foi atrasado."),
  p("basic", "viagem", "Is breakfast included?", "O café da manhã está incluso?"),
  p("basic", "viagem", "Can you recommend a good restaurant around here?", "Pode recomendar um bom restaurante por aqui?"),
  p("basic", "viagem", "I'm looking for the airport shuttle.", "Estou procurando o transporte para o aeroporto."),
  // Intermediário · trabalho
  p("mid", "trabalho", "I'd like to schedule a meeting for next week.", "Gostaria de marcar uma reunião para a próxima semana."),
  p("mid", "trabalho", "Let's go over the main points one more time.", "Vamos rever os pontos principais mais uma vez."),
  p("mid", "trabalho", "I'll make sure it gets done by Friday.", "Vou garantir que fique pronto até sexta."),
  p("mid", "trabalho", "Could you give me a quick update on the project?", "Pode me dar uma atualização rápida do projeto?"),
  p("mid", "trabalho", "I'm afraid I won't be able to make it.", "Receio que não vou conseguir ir."),
  p("mid", "trabalho", "Thanks for flagging that. I'll take a look.", "Obrigado por sinalizar. Vou dar uma olhada."),
  p("mid", "trabalho", "I'm happy to jump on a call if that helps.", "Fico feliz em entrar numa chamada, se ajudar."),
  p("mid", "trabalho", "Let me share my screen so you can see it.", "Deixa eu compartilhar a tela para você ver."),
  // Intermediário · tech
  p("mid", "tech", "The tests are failing because of a missing dependency.", "Os testes estão falhando por causa de uma dependência ausente."),
  p("mid", "tech", "I pushed a fix, but it needs another review.", "Subi uma correção, mas ela precisa de outra revisão."),
  p("mid", "tech", "We should add some logging to find the root cause.", "Deveríamos adicionar logs para achar a causa raiz."),
  p("mid", "tech", "This endpoint returns an error when the payload is empty.", "Este endpoint retorna erro quando o payload está vazio."),
  p("mid", "tech", "Can you reproduce the issue on your side?", "Você consegue reproduzir o problema aí?"),
  p("mid", "tech", "I'm going to refactor this function to make it easier to test.", "Vou refatorar esta função para facilitar os testes."),
  // Avançado
  p("advanced", "geral", "Had I known about the delay, I would have left earlier.", "Se eu soubesse do atraso, teria saído mais cedo."),
  p("advanced", "geral", "Not only did she finish early, but she also helped the others.", "Ela não só terminou cedo, como também ajudou os outros."),
  p("advanced", "geral", "I wish I had started learning English sooner.", "Queria ter começado a aprender inglês antes."),
  p("advanced", "geral", "Despite the setbacks, the team managed to deliver on time.", "Apesar dos contratempos, a equipe conseguiu entregar no prazo."),
  p("advanced", "geral", "The longer you wait, the harder it gets.", "Quanto mais você espera, mais difícil fica."),
  p("advanced", "trabalho", "I'd appreciate it if you could look into this by the end of the day.", "Eu agradeceria se você pudesse ver isso até o fim do dia."),
  p("advanced", "trabalho", "Let's table this discussion until we have more data.", "Vamos deixar essa discussão de lado até termos mais dados."),
  p("advanced", "trabalho", "I see where you're coming from, but I respectfully disagree.", "Entendo seu ponto, mas discordo respeitosamente."),
  p("advanced", "tech", "The bug only surfaces under heavy load, which makes it hard to diagnose.", "O bug só aparece sob carga alta, o que dificulta o diagnóstico."),
  p("advanced", "tech", "We traded some flexibility for a much simpler architecture.", "Trocamos alguma flexibilidade por uma arquitetura bem mais simples."),
];

export const words: Word[] = [...intermediateWords, ...extraWords];
export const phrases: Phrase[] = [...intermediatePhrases, ...extraPhrases];

export type Filter = { level: Level | "all"; theme: Theme | "all" };
export const defaultFilter: Filter = { level: "all", theme: "all" };

/** Filtra por nível e tema; se o filtro esvaziar a lista, volta para tudo. */
export function pool<T extends { level: Level; theme: Theme }>(list: T[], filter: Filter): T[] {
  const picked = list.filter(
    (item) =>
      (filter.level === "all" || item.level === filter.level) &&
      (filter.theme === "all" || item.theme === filter.theme),
  );
  return picked.length ? picked : list;
}

/** Dias desde 1970 no fuso local: muda à meia-noite local, não à UTC. */
function dayNumber(date: Date): number {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60_000) / 86_400_000);
}

/** `offset` anda para a próxima do mesmo filtro ("Outra palavra"). */
export const wordOfTheDay = (filter: Filter = defaultFilter, offset = 0, date = new Date()): Word => {
  const list = pool(words, filter);
  return list[(dayNumber(date) + offset) % list.length];
};

/** Frases mudam com um deslocamento próprio, para não repetirem o ritmo das palavras. */
export const phraseOfTheDay = (filter: Filter = defaultFilter, offset = 0, date = new Date()): Phrase => {
  const list = pool(phrases, filter);
  return list[(dayNumber(date) * 7 + 3 + offset) % list.length];
};
