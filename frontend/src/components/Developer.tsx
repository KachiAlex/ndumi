import { Wrap } from "./primitives";

export function Developer() {
  return (
    <section id="developers" className="py-20">
      <Wrap>
        <div className="reveal grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="mb-3 font-mono text-[10.5px] uppercase tracking-[1.4px] text-indigo">
              For developers
            </div>
            <h2 className="font-display italic font-semibold text-[clamp(26px,3.4vw,36px)] leading-[1.15] mb-3.5 m-0">
              A session is a few lines away.
            </h2>
            <p className="text-text-dim text-[14.5px] leading-relaxed mb-[22px] max-w-[440px]">
              Open a session, stream audio in, get transcripts and spoken replies back over the same socket.
            </p>
            <a href="#" className="btn-ghost">Read the API docs →</a>
          </div>

          <div className="bg-bg-deep border border-line rounded-code p-[22px] font-mono text-[12.5px] leading-[1.7] overflow-x-auto">
            <span className="text-text-faint">{"// open a Ndumi session"}</span>
            <br />
            <span className="text-gold">const</span> <span className="text-text">session</span> = <span className="text-gold">await</span> fetch(<span className="text-camwood-2">"https://api.ndumi.ai/v1/sessions"</span>, {"{"}
            <br />
            &nbsp;&nbsp;method: <span className="text-camwood-2">"POST"</span>,
            <br />
            &nbsp;&nbsp;headers: {"{"} <span className="text-camwood-2">"Authorization"</span>: <span className="text-camwood-2">"Bearer YOUR_KEY"</span> {"}"}
            <br />
            {"});"}
            <br />
            <br />
            <span className="text-text-faint">{"// stream audio, listen for replies"}</span>
            <br />
            <span className="text-gold">const</span> <span className="text-text">ws</span> = <span className="text-gold">new</span> <span className="text-indigo">WebSocket</span>(session.ws_url);
            <br />
            ws.on(<span className="text-camwood-2">"final_transcript"</span>, (t) =&gt; console.log(t.language, t.text));
            <br />
            ws.on(<span className="text-camwood-2">"agent_audio_chunk"</span>, (chunk) =&gt; player.push(chunk));
          </div>
        </div>
      </Wrap>
    </section>
  );
}
