"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeftRight, Check, Flame, Mic, Plus, RotateCcw, Shuffle, Snail, Volume2, X } from "lucide-react";
import { levels, phraseOfTheDay, themes, wordOfTheDay, type Level, type Theme } from "@features/english/model/content";
import { goals, type useEnglish } from "@features/english/model/use-english";
import { compare, type WordResult } from "@features/english/model/compare";
import { canSpeak, speak } from "@features/english/model/speak";
import { guessDirection, translate, type Direction } from "@features/english/model/translate";
import type { useVocab } from "@features/english/model/use-vocab";
import { useSpeech } from "@features/search/model/use-speech";

type Props = {
  vocab: ReturnType<typeof useVocab>;
  english: ReturnType<typeof useEnglish>;
};

type Mode = "speak" | "type";

/**
 * Inglês de todo dia: palavra do dia, frase para praticar (falando ou
 * escrevendo o que ouviu), tradutor e vocabulário. Pronúncia pela voz do
 * sistema; só o tradutor usa a rede, e só quando você pede.
 */
export function EnglishPanel({ vocab, english }: Props) {
  const { filter, mark } = english;
  const [wordOffset, setWordOffset] = useState(0);
  const [phraseOffset, setPhraseOffset] = useState(0);
  const word = useMemo(() => wordOfTheDay(filter, wordOffset), [filter, wordOffset]);
  const phrase = useMemo(() => phraseOfTheDay(filter, phraseOffset), [filter, phraseOffset]);
  const [voice, setVoice] = useState(true);
  useEffect(() => setVoice(canSpeak()), []);

  /* ---------- Prática ---------- */
  const [mode, setMode] = useState<Mode>("type");
  const [typed, setTyped] = useState("");
  const [outcome, setOutcome] = useState<{ score: number; result: WordResult[] } | null>(null);
  const [heard, setHeard] = useState("");
  const speech = useSpeech((text, final) => {
    setHeard(text);
    if (final) {
      setOutcome(compare(phrase.en, text));
      mark("phrase");
    }
  });
  useEffect(() => {
    if (speech.supported) setMode("speak");
  }, [speech.supported]);

  function reset() {
    setOutcome(null);
    setTyped("");
    setHeard("");
  }
  function check(event: FormEvent) {
    event.preventDefault();
    if (typed.trim()) {
      setOutcome(compare(phrase.en, typed));
      mark("phrase");
    }
  }
  const revealed = mode === "speak" || outcome !== null;

  /* ---------- Tradutor ---------- */
  const [source, setSource] = useState("");
  const [direction, setDirection] = useState<Direction | null>(null);
  const [translation, setTranslation] = useState<{ en: string; pt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function run(event: FormEvent) {
    event.preventDefault();
    const text = source.trim();
    if (!text || busy) return;
    const dir = direction ?? guessDirection(text);
    setBusy(true);
    setProblem(null);
    try {
      const result = await translate(text, dir);
      setTranslation(dir === "pt|en" ? { en: result, pt: text } : { en: text, pt: result });
      mark("vocab");
    } catch (error) {
      setTranslation(null);
      setProblem(error instanceof Error ? error.message : "Falha na tradução.");
    } finally {
      setBusy(false);
    }
  }

  const wordSaved = vocab.has(word.en);

  return (
    <section className="section english-section" aria-label="Inglês">
      <div className="section-heading">
        <h2>
          Inglês
          <span className="section-hint" aria-hidden="true">
            <kbd>Alt</kbd>
            <kbd>I</kbd>
          </span>
        </h2>
        {!voice && <span className="english-warn">Este navegador não tem voz sintetizada</span>}
      </div>

      <div className="english-bar">
        <div className="english-goals" aria-label="Metas de hoje">
          <span className="english-streak" data-on={english.streak > 0}>
            <Flame size={16} aria-hidden="true" />
            {english.streak} {english.streak === 1 ? "dia seguido" : "dias seguidos"}
          </span>
          {goals.map((goal) => (
            <span key={goal.id} className="english-goal" data-done={english.done.includes(goal.id)}>
              <Check size={13} strokeWidth={3} aria-hidden="true" />
              {goal.label}
            </span>
          ))}
        </div>
        <div className="english-filters">
          <label>
            <span className="visually-hidden">Nível</span>
            <select
              value={filter.level}
              onChange={(event) => {
                english.setFilter({ level: event.target.value as Level | "all" });
                setWordOffset(0);
                setPhraseOffset(0);
                reset();
              }}
            >
              <option value="all">Todos os níveis</option>
              {levels.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="visually-hidden">Tema</span>
            <select
              value={filter.theme}
              onChange={(event) => {
                english.setFilter({ theme: event.target.value as Theme | "all" });
                setWordOffset(0);
                setPhraseOffset(0);
                reset();
              }}
            >
              <option value="all">Todos os temas</option>
              {themes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="english-grid">
        <article className="english-card english-daily">
          <span className="english-eyebrow">Palavra do dia</span>
          <h3 className="english-term">{word.en}</h3>
          <p className="english-meaning">{word.pt}</p>
          <p className="english-example">“{word.example}”</p>
          <div className="english-actions">
            <button type="button" className="english-btn" onClick={() => {
                speak(word.en);
                mark("word");
              }}
              disabled={!voice}
            >
              <Volume2 size={15} aria-hidden="true" /> Ouvir
            </button>
            <button type="button" className="english-btn" onClick={() => {
                speak(word.example, true);
                mark("word");
              }}
              disabled={!voice}
            >
              <Snail size={15} aria-hidden="true" /> Frase devagar
            </button>
            <button
              type="button"
              className="english-btn is-primary"
              onClick={() => {
                vocab.add(word.en, word.pt);
                mark("word");
                mark("vocab");
              }}
              disabled={wordSaved}
            >
              {wordSaved ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
              {wordSaved ? "Salva" : "Salvar"}
            </button>
            <button
              type="button"
              className="english-btn english-more"
              onClick={() => setWordOffset((value) => value + 1)}
              title="Outra palavra do mesmo nível e tema"
            >
              <Shuffle size={15} aria-hidden="true" /> Outra
            </button>
          </div>
        </article>

        <article className="english-card english-practice">
          <div className="english-practice-head">
            <span className="english-eyebrow">Prática</span>
            <div className="english-head-actions">
              <button
                type="button"
                className="english-btn english-more"
                onClick={() => {
                  setPhraseOffset((value) => value + 1);
                  reset();
                }}
                title="Outra frase do mesmo nível e tema"
              >
                <Shuffle size={15} aria-hidden="true" /> Outra frase
              </button>
            <div className="english-tabs" role="tablist" aria-label="Modo de prática">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "speak"}
                onClick={() => {
                  setMode("speak");
                  reset();
                }}
              >
                Falar
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "type"}
                onClick={() => {
                  setMode("type");
                  reset();
                }}
              >
                Ouvir e escrever
              </button>
            </div>
            </div>
          </div>

          <p className="english-phrase" data-hidden={!revealed}>
            {outcome
              ? outcome.result.map((item, index) => (
                  <span key={index} className="english-word" data-ok={item.ok}>
                    {item.word}{" "}
                  </span>
                ))
              : revealed
                ? phrase.en
                : "Ouça a frase e escreva o que entendeu."}
          </p>
          <p className="english-meaning">{phrase.pt}</p>

          {mode === "speak" ? (
            speech.supported ? (
              <div className="english-actions">
                <button type="button" className="english-btn" onClick={() => speak(phrase.en)} disabled={!voice}>
                  <Volume2 size={15} aria-hidden="true" /> Ouvir
                </button>
                <button
                  type="button"
                  className="english-btn is-primary"
                  data-listening={speech.listening}
                  onClick={() => {
                    setOutcome(null);
                    setHeard("");
                    speech.toggle();
                  }}
                >
                  <Mic size={15} aria-hidden="true" /> {speech.listening ? "Ouvindo…" : "Repetir em voz alta"}
                </button>
                {outcome && (
                  <button type="button" className="english-btn" onClick={reset}>
                    <RotateCcw size={15} aria-hidden="true" /> De novo
                  </button>
                )}
              </div>
            ) : (
              <p className="english-note">O Firefox não reconhece fala. Use “Ouvir e escrever”.</p>
            )
          ) : (
            <form className="english-type" onSubmit={check}>
              <input
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                placeholder="Escreva o que ouviu"
                aria-label="O que você ouviu"
                autoComplete="off"
                spellCheck={false}
                disabled={outcome !== null}
              />
              <button type="button" className="english-btn" onClick={() => speak(phrase.en)} disabled={!voice}>
                <Volume2 size={15} aria-hidden="true" /> Ouvir
              </button>
              <button type="button" className="english-btn" onClick={() => speak(phrase.en, true)} disabled={!voice}>
                <Snail size={15} aria-hidden="true" /> Devagar
              </button>
              {outcome ? (
                <button type="button" className="english-btn" onClick={reset}>
                  <RotateCcw size={15} aria-hidden="true" /> De novo
                </button>
              ) : (
                <button type="submit" className="english-btn is-primary" disabled={!typed.trim()}>
                  <Check size={15} aria-hidden="true" /> Conferir
                </button>
              )}
            </form>
          )}

          {outcome && (
            <p className="english-score" data-good={outcome.score >= 0.85} role="status">
              {Math.round(outcome.score * 100)}% das palavras
              {mode === "speak" && heard ? ` · você disse: “${heard}”` : ""}
            </p>
          )}
          {speech.error && mode === "speak" && <p className="english-note">{speech.error}</p>}
        </article>
      </div>

      <div className="english-vocab">
        <form className="english-translate" onSubmit={run}>
          <input
            data-hotkey="english"
            aria-keyshortcuts="Alt+I"
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="Traduzir (português ou inglês)…"
            aria-label="Texto para traduzir"
            maxLength={300}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            className="english-dir"
            onClick={() =>
              setDirection((current) => ((current ?? guessDirection(source)) === "pt|en" ? "en|pt" : "pt|en"))
            }
            title="Inverter a direção (o padrão é automático)"
          >
            {(direction ?? guessDirection(source)) === "pt|en" ? "PT" : "EN"}
            <ArrowLeftRight size={13} aria-hidden="true" />
            {(direction ?? guessDirection(source)) === "pt|en" ? "EN" : "PT"}
          </button>
          <button type="submit" className="english-btn is-primary" disabled={!source.trim() || busy}>
            {busy ? "Traduzindo…" : "Traduzir"}
          </button>
        </form>
        {problem && <p className="english-note">{problem}</p>}
        {translation && (
          <div className="english-result">
            <div>
              <strong>{translation.en}</strong>
              <span>{translation.pt}</span>
            </div>
            <div className="english-actions">
              <button type="button" className="english-btn" onClick={() => speak(translation.en)} disabled={!voice}>
                <Volume2 size={15} aria-hidden="true" /> Ouvir
              </button>
              <button
                type="button"
                className="english-btn is-primary"
                onClick={() => vocab.add(translation.en, translation.pt)}
                disabled={vocab.has(translation.en)}
              >
                {vocab.has(translation.en) ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
                {vocab.has(translation.en) ? "Salva" : "Salvar"}
              </button>
            </div>
          </div>
        )}

        {vocab.entries.length > 0 ? (
          <>
            <p className="english-count">
              Vocabulário <span>{vocab.entries.length}</span>
            </p>
            <ul className="english-list">
              {vocab.entries.slice(0, 12).map((entry) => (
                <li key={entry.id} className="english-entry">
                  <button
                    type="button"
                    className="english-say"
                    onClick={() => speak(entry.en)}
                    aria-label={`Ouvir ${entry.en}`}
                    title="Ouvir"
                    disabled={!voice}
                  >
                    <Volume2 size={15} aria-hidden="true" />
                  </button>
                  <span className="english-entry-text">
                    <strong>{entry.en}</strong>
                    <span>{entry.pt}</span>
                  </span>
                  <button
                    type="button"
                    className="english-remove"
                    onClick={() => vocab.remove(entry.id)}
                    aria-label={`Remover ${entry.en}`}
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="english-note">
            Salve palavras da palavra do dia ou do tradutor. Na busca, <kbd>en</kbd> + texto traduz, fala e salva de uma vez.
          </p>
        )}
      </div>
    </section>
  );
}
