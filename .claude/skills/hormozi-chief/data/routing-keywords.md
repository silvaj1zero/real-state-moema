# Routing Keywords (Hormozi Chief)

## Contents

- 2.2 Routing Rules (Keyword-Intent Matrix)

---

### 2.2 Routing Rules (Keyword-Intent Matrix)

The routing engine matches user input against keyword clusters in both PT-BR and EN. Match is case-insensitive. Partial match counts. When multiple routes match, pick the one with the highest keyword density in the user input.

```
ROUTE: hormozi-offers
  KEYWORDS (EN): offer, grand slam, value equation, irresistible offer,
                 offer stack, value stack, bonus, guarantee, dream outcome,
                 perceived likelihood, offer creation, offer engineering,
                 offer audit, enhance offer, commoditization
  KEYWORDS (PT): oferta, grand slam, equacao de valor, oferta irresistivel,
                 stack de valor, bonus, garantia, resultado dos sonhos,
                 probabilidade percebida, criar oferta, engenharia de oferta,
                 comoditizacao, melhorar oferta

ROUTE: hormozi-leads
  KEYWORDS (EN): leads, lead magnet, lead generation, core four,
                 warm outreach, cold outreach, content leads, paid ads leads,
                 referral, affiliate, lead nurture, list building,
                 top of funnel, traffic, audience
  KEYWORDS (PT): leads, ima de leads, geracao de leads, core four,
                 outreach quente, outreach frio, conteudo como leads,
                 anuncios pagos, referencia, afiliado, nutricao de leads,
                 construir lista, topo de funil, trafego, audiencia

ROUTE: hormozi-models
  KEYWORDS (EN): money model, business model, upsell, downsell, cross-sell,
                 continuity, recurring revenue, subscription, payment terms,
                 unit economics, revenue model, monetization, pricing model,
                 churn model, ltv model, cac model
  KEYWORDS (PT): modelo de dinheiro, modelo de negocio, upsell, downsell,
                 cross-sell, continuidade, receita recorrente, assinatura,
                 termos de pagamento, unit economics, modelo de receita,
                 monetizacao, modelo de precificacao

ROUTE: hormozi-hooks
  KEYWORDS (EN): hook, headline, first seconds, opening line, attention,
                 scroll stop, thumb stop, pattern interrupt, curiosity gap,
                 hook formula, 121 hooks
  KEYWORDS (PT): hook, gancho, titulo, primeiros segundos, linha de abertura,
                 atencao, parar scroll, interromper padrao, lacuna de curiosidade,
                 formula de hook, titulo chamativo

ROUTE: hormozi-ads
  KEYWORDS (EN): ad, ads, advertisement, ad script, goated, creative,
                 ad angle, ad testing, ad performance, facebook ads,
                 google ads, youtube ads, meta ads, tiktok ads, ad copy
  KEYWORDS (PT): anuncio, anuncios, ad, script de anuncio, goated, criativo,
                 angulo de anuncio, teste de anuncio, performance de anuncio,
                 anuncios facebook, anuncios google, anuncios youtube

ROUTE: hormozi-pricing
  KEYWORDS (EN): price, pricing, anchor, anchoring, price raise, premium,
                 discount, payment plan, installment, price objection,
                 price perception, price psychology, how much to charge,
                 charge more
  KEYWORDS (PT): preco, precificacao, ancora, ancoragem, aumento de preco,
                 premium, desconto, parcelamento, objecao de preco,
                 percepcao de preco, psicologia de preco, quanto cobrar,
                 cobrar mais

ROUTE: hormozi-copy
  KEYWORDS (EN): copy, copywriting, landing page, sales page, vsl,
                 video sales letter, headline, bullet points, fascinations,
                 sales copy, email copy, funnel copy, page copy, lp,
                 conversion copy
  KEYWORDS (PT): copy, copywriting, pagina de vendas, landing page, vsl,
                 carta de vendas, pontos de bala, fascinacoes, copy de vendas,
                 copy de email, copy de funil, pagina de conversao

ROUTE: hormozi-launch
  KEYWORDS (EN): launch, pre-launch, open cart, close cart, launch sequence,
                 launch timeline, launch plan, product launch, course launch,
                 webinar launch, challenge launch, seed launch, jv launch
  KEYWORDS (PT): lancamento, pre-lancamento, abertura de carrinho,
                 fechamento de carrinho, sequencia de lancamento,
                 timeline de lancamento, plano de lancamento,
                 lancamento de produto, lancamento de curso

ROUTE: hormozi-retention
  KEYWORDS (EN): retention, churn, ltv, lifetime value, nurture, onboarding,
                 engagement, reactivation, win-back, customer success,
                 reduce churn, increase ltv, customer journey, loyalty,
                 ascension, continuity program
  KEYWORDS (PT): retencao, churn, ltv, valor vitalicio, nutricao, onboarding,
                 engajamento, reativacao, recuperacao, sucesso do cliente,
                 reduzir churn, aumentar ltv, jornada do cliente, lealdade,
                 ascensao, programa de continuidade

ROUTE: hormozi-advisor
  KEYWORDS (EN): advice, strategy, counsel, general question, direction,
                 what should I, philosophy, principle, framework, thinking,
                 approach, perspective, opinion, recommendation
  KEYWORDS (PT): conselho, estrategia, duvida geral, direcao,
                 o que devo, filosofia, principio, framework, pensamento,
                 abordagem, perspectiva, opiniao, recomendacao

ROUTE: hormozi-audit
  KEYWORDS (EN): audit, diagnostic, review, evaluate, score, assessment,
                 checklist, health check, gap analysis, weakness, problem,
                 what is wrong, fix my, improve my, critique
  KEYWORDS (PT): auditoria, diagnostico, review, avaliar, pontuacao,
                 avaliacao, checklist, check, analise de gap, fraqueza,
                 problema, o que esta errado, consertar, melhorar, critica

ROUTE: hormozi-closer
  KEYWORDS (EN): sell, close, objection, closer, sales script, sales call,
                 closing technique, handle objection, overcome objection,
                 sales conversation, discovery call, demo call, pitch,
                 CLOSER framework
  KEYWORDS (PT): vender, fechar, objecao, closer, script de vendas,
                 chamada de vendas, tecnica de fechamento, lidar com objecao,
                 superar objecao, conversa de vendas, chamada de descoberta,
                 pitch, framework closer

ROUTE: hormozi-scale
  KEYWORDS (EN): scale, grow, growth, expand, scaling, team, hire, delegate,
                 systems, processes, automation, leverage, 9 stages,
                 operations, efficiency, bottleneck, constraint
  KEYWORDS (PT): escalar, crescer, crescimento, expandir, scaling, equipe,
                 contratar, delegar, sistemas, processos, automacao,
                 alavancagem, 9 estagios, operacoes, eficiencia,
                 gargalo, restricao

ROUTE: hormozi-workshop
  KEYWORDS (EN): workshop, event, live event, seminar, bootcamp,
                 masterclass, intensive, retreat, group coaching,
                 live selling, stage selling
  KEYWORDS (PT): workshop, evento, evento ao vivo, seminario, bootcamp,
                 masterclass, intensivo, retiro, coaching em grupo,
                 venda ao vivo, venda no palco

ROUTE: hormozi-content
  KEYWORDS (EN): content, youtube, social media, post, video, podcast,
                 content strategy, content creation, content calendar,
                 platform, distribution, repurpose, organic, free content,
                 thought leadership
  KEYWORDS (PT): conteudo, youtube, redes sociais, post, video, podcast,
                 estrategia de conteudo, criacao de conteudo,
                 calendario de conteudo, plataforma, distribuicao,
                 reaproveitamento, organico, conteudo gratuito
```

