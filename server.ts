import { join } from "node:path";
import { readFile } from "node:fs/promises";

type CommentItem = {
  id: number;
  content: string;
  createdAt: string;
};

const comments: CommentItem[] = [];
let nextId = 1;

const publicDir = join(process.cwd(), "public");

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function compileTemplate(template: string, vars: Record<string, string>): string {
  let output = template;
  for (const [key, value] of Object.entries(vars)) {
    output = output.replaceAll(`{{${key}}}`, value);
  }
  return output;
}

function renderComments(mode: "unsafe" | "safe"): string {
  if (comments.length === 0) {
    return `
      <div class="empty-state text-center p-4 rounded-4 border">
        <div class="fs-1 mb-2">💬</div>
        <h5 class="mb-2">No hay comentarios todavía</h5>
        <p class="text-secondary mb-0">
          Publica uno desde el formulario para probar el comportamiento de la ruta.
        </p>
      </div>
    `;
  }

  const ordered = [...comments].reverse();

  return ordered
    .map((comment) => {
      const renderedContent =
        mode === "safe" ? escapeHtml(comment.content) : comment.content;

      return `
        <article class="comment-card card border-0 shadow-sm rounded-4">
          <div class="card-body p-4">
            <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
              <div>
                <span class="comment-id badge text-bg-dark rounded-pill px-3 py-2">
                  Comentario #${comment.id}
                </span>
              </div>
              <small class="text-secondary">
                ${formatDate(comment.createdAt)}
              </small>
            </div>
            <div class="comment-body">
              ${renderedContent}
            </div>
          </div>
        </article>
      `;
    })
    .join("\n");
}

async function renderPage(mode: "unsafe" | "safe"): Promise<string> {
  const templatePath = join(publicDir, "template.html");
  const template = await readFile(templatePath, "utf8");

  const safeMode = mode === "safe";
  const lastComment = comments.at(-1);

  return compileTemplate(template, {
    PAGE_TITLE: safeMode
      ? "Stored XSS Lab - Ruta segura"
      : "Stored XSS Lab - Ruta vulnerable",
    MODE: mode,
    ROUTE_PATH: `/${mode}`,
    ROUTE_TITLE: safeMode ? "Ruta segura" : "Ruta vulnerable",
    ROUTE_BADGE_CLASS: safeMode ? "text-bg-success" : "text-bg-danger",
    ROUTE_DESCRIPTION: safeMode
      ? "En esta vista el comentario se escapa antes de renderizarse."
      : "En esta vista el comentario se inserta directamente en el HTML.",
    ROUTE_EXPLANATION: safeMode
      ? "La salida se procesa antes de mostrarse, por lo que el contenido se presenta como texto."
      : "La salida se incrusta directamente en el documento HTML, por lo que puede ejecutarse contenido activo.",
    COMMENTS_COUNT: String(comments.length),
    LAST_COMMENT: lastComment
      ? `#${lastComment.id} enviado el ${formatDate(lastComment.createdAt)}`
      : "Aún no se ha registrado ningún comentario.",
    COMMENTS_HTML: renderComments(mode),
  });
}

function redirect(path: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: path },
  });
}

function serveStaticFile(filename: string, contentType: string): Response {
  const file = Bun.file(join(publicDir, filename));
  return new Response(file, {
    headers: { "Content-Type": contentType },
  });
}

Bun.serve({
  port: 2026,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/") {
      return redirect("/unsafe");
    }

    if (req.method === "GET" && url.pathname === "/unsafe") {
      return new Response(await renderPage("unsafe"), {
        headers: { "Content-Type": "text/html; charset=UTF-8" },
      });
    }

    if (req.method === "GET" && url.pathname === "/safe") {
      return new Response(await renderPage("safe"), {
        headers: { "Content-Type": "text/html; charset=UTF-8" },
      });
    }

    if (req.method === "GET" && url.pathname === "/styles.css") {
      return serveStaticFile("styles.css", "text/css; charset=UTF-8");
    }

    if (req.method === "GET" && url.pathname === "/app.js") {
      return serveStaticFile("app.js", "application/javascript; charset=UTF-8");
    }

    if (
      req.method === "POST" &&
      (url.pathname === "/comment/unsafe" || url.pathname === "/comment/safe")
    ) {
      const formData = await req.formData();
      const content = String(formData.get("comment") || "").trim();

      if (content.length > 0) {
        comments.push({
          id: nextId++,
          content,
          createdAt: new Date().toISOString(),
        });
      }

      return redirect(url.pathname.endsWith("/unsafe") ? "/unsafe" : "/safe");
    }

    if (req.method === "POST" && url.pathname === "/reset") {
      const formData = await req.formData();
      const redirectTo = String(formData.get("redirectTo") || "/unsafe");

      comments.length = 0;
      nextId = 1;

      return redirect(redirectTo === "/safe" ? "/safe" : "/unsafe");
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log("Servidor listo en http://0.0.0.0:2026");
