# Changelog

## [0.3.4](https://github.com/knowttl/atelier-axi/compare/atelier-axi-v0.3.3...atelier-axi-v0.3.4) (2026-08-11)


### Features

* **cli:** add self-contained Agent Plugin support ([#223](https://github.com/knowttl/atelier-axi/issues/223)) ([8b43c21](https://github.com/knowttl/atelier-axi/commit/8b43c21f4a6d4d8096db63601dce4f31a48a68a4))
* **cli:** guard against invisible unpainted artifacts ([#230](https://github.com/knowttl/atelier-axi/issues/230)) ([b285c40](https://github.com/knowttl/atelier-axi/commit/b285c40a55a4d84fdb321923794eff13f6fb5543))
* sync upstream lavish-axi (Agent Plugin support, self-paint guard, security hardening) ([fc8dc4d](https://github.com/knowttl/atelier-axi/commit/fc8dc4d9f13b31b06bf5ab6eccace3cf186e68e1))


### Bug Fixes

* **chrome:** remove persistent layout issue banner ([#226](https://github.com/knowttl/atelier-axi/issues/226)) ([fb9107e](https://github.com/knowttl/atelier-axi/commit/fb9107e2d1e8e1820d93ad977a121f34a66e13be))
* **cli:** make version checks near-instant ([#222](https://github.com/knowttl/atelier-axi/issues/222)) ([8ef64df](https://github.com/knowttl/atelier-axi/commit/8ef64dff4980a367a904aff7f24a0d7edcba191c))
* **server:** confine artifact asset route by realpath (symlink-escape hardening) ([#194](https://github.com/knowttl/atelier-axi/issues/194)) ([6215658](https://github.com/knowttl/atelier-axi/commit/62156587cd163f14e90c0e7014492d1961afa5f7))
* **server:** harden feedback submission boundaries ([#235](https://github.com/knowttl/atelier-axi/issues/235)) ([89412ca](https://github.com/knowttl/atelier-axi/commit/89412ca1c0c8490476edffa065317cd0e093afc8))
* streamline invisible artifact guidance ([#232](https://github.com/knowttl/atelier-axi/issues/232)) ([232972b](https://github.com/knowttl/atelier-axi/commit/232972beba9e0e4e75682c98f2aeb2cf01532122))

## [0.3.3](https://github.com/knowttl/atelier-axi/compare/atelier-axi-v0.3.2...atelier-axi-v0.3.3) (2026-08-03)


### Features

* add multiplexed event stream foundation ([#212](https://github.com/knowttl/atelier-axi/issues/212)) ([34ed7f3](https://github.com/knowttl/atelier-axi/commit/34ed7f39875e472546935237b0f545d08a54f828))
* add passive layout issue triage ([bfbddc7](https://github.com/knowttl/atelier-axi/commit/bfbddc7dda9532ccba565ad03aa527a86e45f7f5))
* add passive layout warning triage ([#210](https://github.com/knowttl/atelier-axi/issues/210)) ([3c75e1f](https://github.com/knowttl/atelier-axi/commit/3c75e1f86350a78bbad21b1779e559cd11738e52))
* sync upstream passive layout warning triage onto the atelier rename ([ef49409](https://github.com/knowttl/atelier-axi/commit/ef49409e85f13133e79bd750d693268b24678a30))


### Bug Fixes

* **cli:** detect truncated poll deliveries ([#31](https://github.com/knowttl/atelier-axi/issues/31)) ([711941e](https://github.com/knowttl/atelier-axi/commit/711941e4e8dab81229a17a3dc01d662a0bc27789))
* restore long-poll-only feedback delivery ([#214](https://github.com/knowttl/atelier-axi/issues/214)) ([7c64184](https://github.com/knowttl/atelier-axi/commit/7c64184adce8b2b18c1cb072779305303b8079d9))
* **server:** prevent competing polls from dropping feedback ([#30](https://github.com/knowttl/atelier-axi/issues/30)) ([1b9e6bd](https://github.com/knowttl/atelier-axi/commit/1b9e6bdb20460aa04aef56d1fea5c48901a27b8b))

## [0.3.2](https://github.com/knowttl/atelier-axi/compare/atelier-axi-v0.3.1...atelier-axi-v0.3.2) (2026-07-27)


### Features

* **playbooks:** require plain-English option explanations on decision surfaces ([#24](https://github.com/knowttl/atelier-axi/issues/24)) ([de13b5c](https://github.com/knowttl/atelier-axi/commit/de13b5cc431cacd59639ee5265aacac90886357b))
* **server:** support non-loopback hosts and reverse proxies ([61fc908](https://github.com/knowttl/atelier-axi/commit/61fc9081753a840d34b8dc9dd6207bb860fcedbe))
* **server:** support non-loopback hosts and reverse proxies ([879794a](https://github.com/knowttl/atelier-axi/commit/879794adf947d9ff8da18df013da82c0d604f695))


### Bug Fixes

* **chrome:** preserve decisions sent during agent updates ([#28](https://github.com/knowttl/atelier-axi/issues/28)) ([deb4240](https://github.com/knowttl/atelier-axi/commit/deb424089a2f53db1bb524981b2463ed4d2fa02c))
* **chrome:** start review sessions with annotate mode off ([#25](https://github.com/knowttl/atelier-axi/issues/25)) ([8770199](https://github.com/knowttl/atelier-axi/commit/877019968a13dce2423612ef2e027a82a8b5219f))
* **ci:** execute every PR body compliance event ([42b49ee](https://github.com/knowttl/atelier-axi/commit/42b49ee21f2dc7b3da6b9ef8d9b37b5ea5f00ce9))
* **cli:** suppress recurring poll wait ticks outside interactive terminals ([#179](https://github.com/knowttl/atelier-axi/issues/179)) ([c012361](https://github.com/knowttl/atelier-axi/commit/c012361205ff2ae961b6d3f7f6a51168bbfa1a39))
* **cli:** suppress recurring poll wait ticks outside interactive terminals ([#179](https://github.com/knowttl/atelier-axi/issues/179)) ([50b0fac](https://github.com/knowttl/atelier-axi/commit/50b0facb61b5fc36cb1737e33b20d2894a64323b))
* **cli:** surface session wrap-up guidance ([#27](https://github.com/knowttl/atelier-axi/issues/27)) ([a08bcfe](https://github.com/knowttl/atelier-axi/commit/a08bcfe325040ea430ae9c959ca18ccbb7b9231f))
* execute every PR body compliance event ([#197](https://github.com/knowttl/atelier-axi/issues/197)) ([f5a1ecb](https://github.com/knowttl/atelier-axi/commit/f5a1ecb8e32cfa7eb61bc7c713befd99b180e121))
* **server:** accept bare IP-literal Host headers so LAN access keeps working ([9e85709](https://github.com/knowttl/atelier-axi/commit/9e85709e051a8b97378db35362816a8ec2459057))
* **server:** clear delivered-feedback working presence on agent reply ([#161](https://github.com/knowttl/atelier-axi/issues/161)) ([a451249](https://github.com/knowttl/atelier-axi/commit/a451249c5a3f17b0fae7172050cacc3137388816))
* **server:** clear delivered-feedback working presence on agent reply ([#161](https://github.com/knowttl/atelier-axi/issues/161)) ([50a5477](https://github.com/knowttl/atelier-axi/commit/50a54774b1dfcaa96fce46765e6b156b5a8eab1d))
* **server:** reject trailing garbage after a bracketed IPv6 Host ([17ac5b0](https://github.com/knowttl/atelier-axi/commit/17ac5b017dc6100d363e7955b6673fa63ebd8f25))
* **server:** reject trailing garbage after a bracketed IPv6 Host ([c229ef4](https://github.com/knowttl/atelier-axi/commit/c229ef49618a7f042b7004ca57e5a5733938e92f))
* **server:** secure host handling without breaking LAN access ([b94461a](https://github.com/knowttl/atelier-axi/commit/b94461a704eef173fbc7b6626722ddba0e1ac19c))
* **server:** validate the Host header to close DNS rebinding ([d4aee1a](https://github.com/knowttl/atelier-axi/commit/d4aee1a80f3354f5ac76aed6198001de01487126))
* **server:** validate the Host header to close DNS rebinding ([f016972](https://github.com/knowttl/atelier-axi/commit/f016972251556a83cd4712cf081a475cfcf3646a))
* **whiteboard:** prevent converted labels from overflowing shapes ([#26](https://github.com/knowttl/atelier-axi/issues/26)) ([589b419](https://github.com/knowttl/atelier-axi/commit/589b4195f29864b78da1d0aabb9857a161b21619))

## [0.3.1](https://github.com/knowttl/atelier-axi/compare/atelier-axi-v0.3.0...atelier-axi-v0.3.1) (2026-07-19)


### Bug Fixes

* sync upstream layout, polling, and whiteboard improvements ([#19](https://github.com/knowttl/atelier-axi/issues/19)) ([fd314ed](https://github.com/knowttl/atelier-axi/commit/fd314edb30613c691a7b0b21bc85596cf826eef6))

## [0.3.0](https://github.com/knowttl/atelier-axi/compare/atelier-axi-v0.2.4...atelier-axi-v0.3.0) (2026-07-17)


### Features

* edit Mermaid diagrams as whiteboards ([#166](https://github.com/knowttl/atelier-axi/issues/166)) ([1b9e445](https://github.com/knowttl/atelier-axi/commit/1b9e445b49a149221ce7338252d0f72a4dac5706))
* edit Mermaid diagrams as whiteboards ([#166](https://github.com/knowttl/atelier-axi/issues/166)) ([94a181c](https://github.com/knowttl/atelier-axi/commit/94a181c2954d5ad49249d85681be61a0385ec47a))
* **skills:** add local.upstream-sync review skill ([f9b3109](https://github.com/knowttl/atelier-axi/commit/f9b310957d2f6b46045dd46b9f991764205b9fd1))


### Bug Fixes

* **cli:** keep Codex polls attached to active turns ([#165](https://github.com/knowttl/atelier-axi/issues/165)) ([24aab31](https://github.com/knowttl/atelier-axi/commit/24aab313c310e853e41b3458fe17da55439e4e39))
* **cli:** keep Codex polls attached to active turns ([#165](https://github.com/knowttl/atelier-axi/issues/165)) ([ab31405](https://github.com/knowttl/atelier-axi/commit/ab31405882f950696a2ddc79deb90d4caada7543))
* prevent batched feedback from being dropped ([#18](https://github.com/knowttl/atelier-axi/issues/18)) ([7fc9c81](https://github.com/knowttl/atelier-axi/commit/7fc9c811d37a3404206e98309dc4fa57a0080fdf))
* sync Mermaid diagrams with page themes ([#162](https://github.com/knowttl/atelier-axi/issues/162)) ([717e244](https://github.com/knowttl/atelier-axi/commit/717e244b48402ff525cd3c5d0b0db7098bfd55cb))
* sync Mermaid diagrams with page themes ([#162](https://github.com/knowttl/atelier-axi/issues/162)) ([957eab4](https://github.com/knowttl/atelier-axi/commit/957eab4c11474a6ae15988a9b10d64ad08670a73))


### Miscellaneous Chores

* release atelier-axi as 0.3.0 ([7474483](https://github.com/knowttl/atelier-axi/commit/7474483ac041189109701f306a44e99de6d5f2d3))

## [0.2.4](https://github.com/knowttl/atelier-axi/compare/atelier-axi-v0.2.3...atelier-axi-v0.2.4) (2026-07-09)


### Features

* **planning:** grill the spec draft before the review loop ([6693962](https://github.com/knowttl/atelier-axi/commit/66939623866f24656a6c9cfdb837ee07048c9a16))

## [0.2.3](https://github.com/knowttl/atelier-axi/compare/atelier-axi-v0.2.2...atelier-axi-v0.2.3) (2026-07-09)


### Features

* **cli:** refresh the atelier skill on update ([1b898f8](https://github.com/knowttl/atelier-axi/commit/1b898f8d0429d79942840d29797bbde4d1424ba9))

## [0.2.2](https://github.com/knowttl/atelier-axi/compare/atelier-axi-v0.2.1...atelier-axi-v0.2.2) (2026-07-08)


### Features

* **input:** reflect confirmed-sent decisions in input-card UI ([42e12b7](https://github.com/knowttl/atelier-axi/commit/42e12b7ea36e3f4475dec5e52ee543fcb1255a21))
* **server:** surface artifact favicon and title on the Lavish tab ([#116](https://github.com/knowttl/atelier-axi/issues/116)) ([8b9f79f](https://github.com/knowttl/atelier-axi/commit/8b9f79f0c36523403cec8e05b89b500a2e8902bd))


### Bug Fixes

* **chrome:** add conversation empty state ([#155](https://github.com/knowttl/atelier-axi/issues/155)) ([6c81509](https://github.com/knowttl/atelier-axi/commit/6c81509c098cafc646c0c3d5fd7e4f462cf30cb1))
* **chrome:** keep composer visible with long feedback queues ([#146](https://github.com/knowttl/atelier-axi/issues/146)) ([a36aeb6](https://github.com/knowttl/atelier-axi/commit/a36aeb676eef161bd58b227a1e171fa2f6b5e071))
* make Send & End a top-level composer action ([#153](https://github.com/knowttl/atelier-axi/issues/153)) ([094bb40](https://github.com/knowttl/atelier-axi/commit/094bb40170e1718f3f8badbd627dbea6dd0b9536))

## [0.2.1](https://github.com/knowttl/atelier-axi/compare/atelier-axi-v0.2.0...atelier-axi-v0.2.1) (2026-07-05)


### Features

* add zoomable mermaid diagram annotations and annotate/explore mode hotkey ([#8](https://github.com/knowttl/atelier-axi/issues/8)) ([3bd14c4](https://github.com/knowttl/atelier-axi/commit/3bd14c4071825c552560088a1d47e63329748480))
* **atelier:** realign skill guidance to end-to-end verification ([#9](https://github.com/knowttl/atelier-axi/issues/9)) ([b1fbb88](https://github.com/knowttl/atelier-axi/commit/b1fbb88c0de070737dcb96cca6e22a22fc5f5f5f))
* **webui,skill:** batch "Queue all answers" button + headless plan mode ([61f3420](https://github.com/knowttl/atelier-axi/commit/61f3420b8f819ef1fecbb30fe5390d7bdb6d8f3e))
* **webui,skill:** batch "Queue all answers" button + headless plan mode ([6bb87f9](https://github.com/knowttl/atelier-axi/commit/6bb87f92993ba151b441f76b14b78cf67ecdd7a6))

## [0.2.0](https://github.com/knowttl/atelier-axi/compare/atelier-axi-v0.1.35...atelier-axi-v0.2.0) (2026-07-03)


### ⚠ BREAKING CHANGES

* the CLI no longer sends telemetry; ATELIER_AXI_TELEMETRY, ATELIER_AXI_UMAMI_HOST, and ATELIER_AXI_UMAMI_WEBSITE_ID are no longer read.
* CLI name, env var prefix, state/artifact dirs, and the window.atelier / data-atelier-* / atelier:* browser SDK contract all changed.

### Features

* add artifact export and hosted sharing ([#123](https://github.com/knowttl/atelier-axi/issues/123)) ([d7deba1](https://github.com/knowttl/atelier-axi/commit/d7deba16aec45a5752a853303f60b5c8dc45e535))
* add input feedback controls ([#17](https://github.com/knowttl/atelier-axi/issues/17)) ([8eda036](https://github.com/knowttl/atelier-axi/commit/8eda036cfd6604823fad4945f9970b32a40e520a))
* add layout audit curtain gate ([#97](https://github.com/knowttl/atelier-axi/issues/97)) ([0fa3968](https://github.com/knowttl/atelier-axi/commit/0fa3968fdf1f7184f52a8d5eb6eeeccc106b46cb))
* **chrome:** align editor chrome with v2 UI ([#63](https://github.com/knowttl/atelier-axi/issues/63)) ([da6c19e](https://github.com/knowttl/atelier-axi/commit/da6c19ec4882024a55333adc83ca481ec16d09c8))
* **cli:** add artifact guidance playbooks ([#12](https://github.com/knowttl/atelier-axi/issues/12)) ([b13f033](https://github.com/knowttl/atelier-axi/commit/b13f033973f91935af97e0688574a0767e66463b))
* **cli:** add GitHub Copilot CLI session start hook support ([#106](https://github.com/knowttl/atelier-axi/issues/106)) ([0b3e28e](https://github.com/knowttl/atelier-axi/commit/0b3e28eae0a139540b7b274293cea98d49961dc4))
* **cli:** add Lavish playbook routing guidance ([#99](https://github.com/knowttl/atelier-axi/issues/99)) ([03cb069](https://github.com/knowttl/atelier-axi/commit/03cb0696ed1c5069db8b464e7299fd87098b1fff))
* **cli:** add server shutdown controls ([#54](https://github.com/knowttl/atelier-axi/issues/54)) ([33c5b45](https://github.com/knowttl/atelier-axi/commit/33c5b4549693d7c8fb5ca8dc59595dcf9377b4cd))
* **cli:** broaden plan playbook guidance ([#52](https://github.com/knowttl/atelier-axi/issues/52)) ([aa533c4](https://github.com/knowttl/atelier-axi/commit/aa533c42c77a696ac0817402688b17cf29c5bdd5))
* **cli:** expose SDK self-update command ([#110](https://github.com/knowttl/atelier-axi/issues/110)) ([26473c7](https://github.com/knowttl/atelier-axi/commit/26473c72e715986cee7130dfea8402007fc9e522))
* **cli:** guide agents to combine relevant playbooks ([#73](https://github.com/knowttl/atelier-axi/issues/73)) ([d0c6e47](https://github.com/knowttl/atelier-axi/commit/d0c6e47d9eaed2efb40c0a14a152ffb8f602900e))
* **cli:** improve AXI home guidance ([#4](https://github.com/knowttl/atelier-axi/issues/4)) ([70b5a30](https://github.com/knowttl/atelier-axi/commit/70b5a30bd2c0cadb97068fa79da316db4a6895ec))
* **cli:** inject packaged design assets ([#16](https://github.com/knowttl/atelier-axi/issues/16)) ([2eb6170](https://github.com/knowttl/atelier-axi/commit/2eb61706823257a677bd8490e97bfe20a98080fa))
* **cli:** reject unknown flags and truncate poll dom_snapshot (AXI 3 & 6) ([c0da74f](https://github.com/knowttl/atelier-axi/commit/c0da74f8f2906d008312e1e9a3d4a2ed52c7e86c))
* **cli:** surface the plan-playbook planning flow at SessionStart ([ee53197](https://github.com/knowttl/atelier-axi/commit/ee5319726e3ce484820bc924c02298dce4f6eade))
* **cli:** tell agents to screenshot existing UI instead of describing it ([#113](https://github.com/knowttl/atelier-axi/issues/113)) ([2189f60](https://github.com/knowttl/atelier-axi/commit/2189f601b147062a69633381d893886a2201361b))
* disclose ht-ml.app in share flows ([#126](https://github.com/knowttl/atelier-axi/issues/126)) ([cd6016a](https://github.com/knowttl/atelier-axi/commit/cd6016a3381ad713c5340db0bf8b53e36ed3ef9c))
* initial commit ([7f1fc95](https://github.com/knowttl/atelier-axi/commit/7f1fc957f9d24a5ebae38fdfe43ad3cb717929b7))
* **plan:** align plan playbook + spec/plan writing with brainstorming ([9b74435](https://github.com/knowttl/atelier-axi/commit/9b7443501c0640294468eb7170b6d68a8b2793b0))
* **planner:** document session teardown and finished-document commits ([3727a0c](https://github.com/knowttl/atelier-axi/commit/3727a0ce34b95973a5f507cc8999bf3778dcdead))
* **planner:** enforce TDD + engineering principles + treehouse dev worktrees ([2069017](https://github.com/knowttl/atelier-axi/commit/2069017ef994e82569f4ee8f694f53eb28942f31))
* **planner:** regression-test decision cards, record review decisions, neutral output root ([1a6079c](https://github.com/knowttl/atelier-axi/commit/1a6079c2c3b2f3af2507652bdf48a284787a463a))
* **playbook:** enrich plan playbook into a feature-planner ([6359dbc](https://github.com/knowttl/atelier-axi/commit/6359dbc8104d352da9474e9eb62b54ad18b36907))
* rebrand from lavish to atelier ([65c9564](https://github.com/knowttl/atelier-axi/commit/65c95644aea4745cc1a9e9d855f8fdb3c10f1728))
* remove Umami telemetry feature ([b5a097b](https://github.com/knowttl/atelier-axi/commit/b5a097bdaed21ae890707b19effb7f0f4709b039))
* rename diff playbook to code ([#85](https://github.com/knowttl/atelier-axi/issues/85)) ([0e3487f](https://github.com/knowttl/atelier-axi/commit/0e3487f3bd95ca9a1902fb1dfbb462c7d218fe44))
* report browser layout warnings through poll ([#95](https://github.com/knowttl/atelier-axi/issues/95)) ([4809102](https://github.com/knowttl/atelier-axi/commit/480910213eb2f12d2c4c514ee4a5c1f03ce1655f))
* **sdk:** first-class zoomable, annotatable mermaid diagrams ([3e6b867](https://github.com/knowttl/atelier-axi/commit/3e6b867ef38479cd1cf5e4b895e31ac898da6530))
* send on Enter in chat input and annotation card ([#58](https://github.com/knowttl/atelier-axi/issues/58)) ([e88679f](https://github.com/knowttl/atelier-axi/commit/e88679f6a02a3ba4fdd6424d569e34f919025077))
* **server:** configurable bind address and link hostname ([#61](https://github.com/knowttl/atelier-axi/issues/61)) ([4bbdafd](https://github.com/knowttl/atelier-axi/commit/4bbdafd3dc41233540b07e034359973506bef6d9))
* **skill:** add lavish-implement execution skill ([6b3f052](https://github.com/knowttl/atelier-axi/commit/6b3f052e249be32d4a4fccc3e215e1404cb95524))
* **skill:** add lavish-plan driver skill ([8f03117](https://github.com/knowttl/atelier-axi/commit/8f03117167ea23a23ea72354e66eeebd845b9e81))
* **skill:** add lavish-plan plan template and review rubrics ([e991f39](https://github.com/knowttl/atelier-axi/commit/e991f3934ba5f8e351ccb9015bec60edd5323945))
* **skill:** enrich lavish-implement with subagent-driven-development patterns ([2b62338](https://github.com/knowttl/atelier-axi/commit/2b623381d30cea96132d2de084cde2fbdc67a15b))
* **skill:** fork brainstorming intake into lavish-plan's visual review ([50dd0e7](https://github.com/knowttl/atelier-axi/commit/50dd0e79c060e868ed76c5fa7ef22747cca002f0))
* **skills:** add Hermes metadata to lavish skill ([#82](https://github.com/knowttl/atelier-axi/issues/82)) ([e634c23](https://github.com/knowttl/atelier-axi/commit/e634c232ec64e97be2643b33235d3fe4c39eb6b8))
* **skills:** add installable Lavish agent skill ([#59](https://github.com/knowttl/atelier-axi/issues/59)) ([5f7cb2e](https://github.com/knowttl/atelier-axi/commit/5f7cb2e4263220ff38f63117ae6293616278fdf6))
* **skills:** add lavish feature-planning and implementation pipeline ([8235e16](https://github.com/knowttl/atelier-axi/commit/8235e163896a513814a18fe4b86cb6eef57422ab))
* **skill:** support /lavish invocation ([#67](https://github.com/knowttl/atelier-axi/issues/67)) ([cd87b1f](https://github.com/knowttl/atelier-axi/commit/cd87b1f057848b1114ad414e99c27808ad044222))
* support text range annotations ([#10](https://github.com/knowttl/atelier-axi/issues/10)) ([dd0ed5c](https://github.com/knowttl/atelier-axi/commit/dd0ed5c1340e945ddd33ebb66317b5e28c78f3e6))
* sync lavish design skill to v2 ([#65](https://github.com/knowttl/atelier-axi/issues/65)) ([d9cfc9d](https://github.com/knowttl/atelier-axi/commit/d9cfc9d42ae8a7875626878d10711cd20f23f2af))


### Bug Fixes

* Add Ctrl+Enter immediate-send shortcut to the annotation card ([#71](https://github.com/knowttl/atelier-axi/issues/71)) ([9922767](https://github.com/knowttl/atelier-axi/commit/9922767ca7f7eb5e4bec02345464fcf107fab42c))
* allow native form controls during annotation ([#56](https://github.com/knowttl/atelier-axi/issues/56)) ([e355502](https://github.com/knowttl/atelier-axi/commit/e355502fb312620108c2dcd38b4280a23e9e27e1))
* **chrome:** center circular close button icons ([#125](https://github.com/knowttl/atelier-axi/issues/125)) ([47deaef](https://github.com/knowttl/atelier-axi/commit/47deaef107cac56deda4dcab5e9c6d903f9e42b4))
* clarify artifact design system guidance ([#89](https://github.com/knowttl/atelier-axi/issues/89)) ([6486407](https://github.com/knowttl/atelier-axi/commit/64864071f739344e3c148e4d570430e0495de586))
* **cli:** improve poll and design guidance ([#74](https://github.com/knowttl/atelier-axi/issues/74)) ([302efac](https://github.com/knowttl/atelier-axi/commit/302efac1c73e486a01486dd394bc49f79fd8ae7b))
* **cli:** make interrupted poll guidance reliable ([#76](https://github.com/knowttl/atelier-axi/issues/76)) ([1a01e26](https://github.com/knowttl/atelier-axi/commit/1a01e2603a545bea773e5126beb653ba84d1a8b5))
* **cli:** prioritize project design guidance ([#50](https://github.com/knowttl/atelier-axi/issues/50)) ([ee782c0](https://github.com/knowttl/atelier-axi/commit/ee782c04d737d888f9f3b3bae1916137d791516b))
* **cli:** require explicit agent hook setup ([#46](https://github.com/knowttl/atelier-axi/issues/46)) ([4a250b8](https://github.com/knowttl/atelier-axi/commit/4a250b843edbe4204599526c753bc94b798c9785))
* **cli:** require polling before user replies ([#33](https://github.com/knowttl/atelier-axi/issues/33)) ([c23c86c](https://github.com/knowttl/atelier-axi/commit/c23c86c499cd16d7cf23ee7d48dca8ee7b74f174))
* **cli:** restart stale servers after upgrades ([#6](https://github.com/knowttl/atelier-axi/issues/6)) ([d473557](https://github.com/knowttl/atelier-axi/commit/d4735576a0fb3933304a4c1394195b512d60ccda))
* editor chrome refresh ([#2](https://github.com/knowttl/atelier-axi/issues/2)) ([68caaef](https://github.com/knowttl/atelier-axi/commit/68caaef46fadf767ed70bf215a5fe9bda44b3190))
* harden feedback polling and queued prompts ([#41](https://github.com/knowttl/atelier-axi/issues/41)) ([ec1e664](https://github.com/knowttl/atelier-axi/commit/ec1e6643533a01f93389532d382897b0451201ee))
* ignore changelog in prettier checks ([c18d955](https://github.com/knowttl/atelier-axi/commit/c18d955af9cf3892150fc207be783c1b0bc90a74))
* improve Lavish design fallback guidance ([#78](https://github.com/knowttl/atelier-axi/issues/78)) ([db9f294](https://github.com/knowttl/atelier-axi/commit/db9f2943a19ef626ccc233d7b4d66dafdf52cc51))
* improve layout audit accuracy and warning persistence ([#129](https://github.com/knowttl/atelier-axi/issues/129)) ([6d91f4b](https://github.com/knowttl/atelier-axi/commit/6d91f4b5f4fe6c198b7599a71041bf25a9f295b2))
* keep Lavish artifacts portable by default ([#40](https://github.com/knowttl/atelier-axi/issues/40)) ([6dc80bc](https://github.com/knowttl/atelier-axi/commit/6dc80bc6d411a19c48d14444d8aa2a13afdaf58f))
* let summary controls toggle in annotation mode ([#100](https://github.com/knowttl/atelier-axi/issues/100)) ([3eb70c6](https://github.com/knowttl/atelier-axi/commit/3eb70c6e8ccdcdbc725b5d282327b0cc08dd1868))
* metadata ([0ac6980](https://github.com/knowttl/atelier-axi/commit/0ac698092c94c0f7c91011ad58db2ddfe673a680))
* preserve artifact scroll on hot reload ([#48](https://github.com/knowttl/atelier-axi/issues/48)) ([81599a1](https://github.com/knowttl/atelier-axi/commit/81599a1f70ff08732b4a809e8634f5f4942b9d3b))
* respect user-ended Lavish sessions ([#132](https://github.com/knowttl/atelier-axi/issues/132)) ([8ca248b](https://github.com/knowttl/atelier-axi/commit/8ca248bc4334316460566fccdd1ef33353b74626))
* **server:** prevent live reload watcher stalls ([#38](https://github.com/knowttl/atelier-axi/issues/38)) ([cc1c841](https://github.com/knowttl/atelier-axi/commit/cc1c8411d3410b591fd5d1de945ba93c889af0e7))
* **server:** track agent presence across polling states ([#31](https://github.com/knowttl/atelier-axi/issues/31)) ([351d7b4](https://github.com/knowttl/atelier-axi/commit/351d7b4174fb4f64b7683ea85a93537ecbb33ad3))
* **skills:** hide internal agent skills from discovery ([#80](https://github.com/knowttl/atelier-axi/issues/80)) ([a4bd520](https://github.com/knowttl/atelier-axi/commit/a4bd520bbbda62a06de6a8c592cd5aebdc5ef055))
* supersede unsent input choices ([#92](https://github.com/knowttl/atelier-axi/issues/92)) ([352dd0d](https://github.com/knowttl/atelier-axi/commit/352dd0d91d00f7914e23282b4b036eaa1ba7ecd2))
* support local artifact assets in hidden directories ([#44](https://github.com/knowttl/atelier-axi/issues/44)) ([2528e8e](https://github.com/knowttl/atelier-axi/commit/2528e8e571cfd0ed299be842df9943c56868f4ac))
* trigger release ([9bbf27f](https://github.com/knowttl/atelier-axi/commit/9bbf27fe77f0e8baa656b577e27fc536d3c7474a))
* upgrade axi js sdk ([#14](https://github.com/knowttl/atelier-axi/issues/14)) ([dfb07f8](https://github.com/knowttl/atelier-axi/commit/dfb07f8862867f07e907c5ad975e14738c0992b2))

## [0.1.35](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.34...lavish-axi-v0.1.35) (2026-07-02)


### Bug Fixes

* respect user-ended Lavish sessions ([#132](https://github.com/kunchenguid/lavish-axi/issues/132)) ([8ca248b](https://github.com/kunchenguid/lavish-axi/commit/8ca248bc4334316460566fccdd1ef33353b74626))

## [0.1.34](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.33...lavish-axi-v0.1.34) (2026-07-02)


### Bug Fixes

* improve layout audit accuracy and warning persistence ([#129](https://github.com/kunchenguid/lavish-axi/issues/129)) ([6d91f4b](https://github.com/kunchenguid/lavish-axi/commit/6d91f4b5f4fe6c198b7599a71041bf25a9f295b2))

## [0.1.33](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.32...lavish-axi-v0.1.33) (2026-07-01)


### Features

* add artifact export and hosted sharing ([#123](https://github.com/kunchenguid/lavish-axi/issues/123)) ([d7deba1](https://github.com/kunchenguid/lavish-axi/commit/d7deba16aec45a5752a853303f60b5c8dc45e535))
* **cli:** add GitHub Copilot CLI session start hook support ([#106](https://github.com/kunchenguid/lavish-axi/issues/106)) ([0b3e28e](https://github.com/kunchenguid/lavish-axi/commit/0b3e28eae0a139540b7b274293cea98d49961dc4))
* **cli:** tell agents to screenshot existing UI instead of describing it ([#113](https://github.com/kunchenguid/lavish-axi/issues/113)) ([2189f60](https://github.com/kunchenguid/lavish-axi/commit/2189f601b147062a69633381d893886a2201361b))
* disclose ht-ml.app in share flows ([#126](https://github.com/kunchenguid/lavish-axi/issues/126)) ([cd6016a](https://github.com/kunchenguid/lavish-axi/commit/cd6016a3381ad713c5340db0bf8b53e36ed3ef9c))


### Bug Fixes

* **chrome:** center circular close button icons ([#125](https://github.com/kunchenguid/lavish-axi/issues/125)) ([47deaef](https://github.com/kunchenguid/lavish-axi/commit/47deaef107cac56deda4dcab5e9c6d903f9e42b4))

## [0.1.32](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.31...lavish-axi-v0.1.32) (2026-06-27)


### Features

* add layout audit curtain gate ([#97](https://github.com/kunchenguid/lavish-axi/issues/97)) ([0fa3968](https://github.com/kunchenguid/lavish-axi/commit/0fa3968fdf1f7184f52a8d5eb6eeeccc106b46cb))
* **cli:** add Lavish playbook routing guidance ([#99](https://github.com/kunchenguid/lavish-axi/issues/99)) ([03cb069](https://github.com/kunchenguid/lavish-axi/commit/03cb0696ed1c5069db8b464e7299fd87098b1fff))
* **cli:** expose SDK self-update command ([#110](https://github.com/kunchenguid/lavish-axi/issues/110)) ([26473c7](https://github.com/kunchenguid/lavish-axi/commit/26473c72e715986cee7130dfea8402007fc9e522))
* report browser layout warnings through poll ([#95](https://github.com/kunchenguid/lavish-axi/issues/95)) ([4809102](https://github.com/kunchenguid/lavish-axi/commit/480910213eb2f12d2c4c514ee4a5c1f03ce1655f))


### Bug Fixes

* let summary controls toggle in annotation mode ([#100](https://github.com/kunchenguid/lavish-axi/issues/100)) ([3eb70c6](https://github.com/kunchenguid/lavish-axi/commit/3eb70c6e8ccdcdbc725b5d282327b0cc08dd1868))

## [0.1.31](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.30...lavish-axi-v0.1.31) (2026-06-16)


### Bug Fixes

* supersede unsent input choices ([#92](https://github.com/kunchenguid/lavish-axi/issues/92)) ([352dd0d](https://github.com/kunchenguid/lavish-axi/commit/352dd0d91d00f7914e23282b4b036eaa1ba7ecd2))

## [0.1.30](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.29...lavish-axi-v0.1.30) (2026-06-14)


### Bug Fixes

* clarify artifact design system guidance ([#89](https://github.com/kunchenguid/lavish-axi/issues/89)) ([6486407](https://github.com/kunchenguid/lavish-axi/commit/64864071f739344e3c148e4d570430e0495de586))

## [0.1.29](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.28...lavish-axi-v0.1.29) (2026-06-12)


### Features

* rename diff playbook to code ([#85](https://github.com/kunchenguid/lavish-axi/issues/85)) ([0e3487f](https://github.com/kunchenguid/lavish-axi/commit/0e3487f3bd95ca9a1902fb1dfbb462c7d218fe44))

## [0.1.28](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.27...lavish-axi-v0.1.28) (2026-06-11)


### Features

* **server:** configurable bind address and link hostname ([#61](https://github.com/kunchenguid/lavish-axi/issues/61)) ([4bbdafd](https://github.com/kunchenguid/lavish-axi/commit/4bbdafd3dc41233540b07e034359973506bef6d9))
* **skills:** add Hermes metadata to lavish skill ([#82](https://github.com/kunchenguid/lavish-axi/issues/82)) ([e634c23](https://github.com/kunchenguid/lavish-axi/commit/e634c232ec64e97be2643b33235d3fe4c39eb6b8))


### Bug Fixes

* **skills:** hide internal agent skills from discovery ([#80](https://github.com/kunchenguid/lavish-axi/issues/80)) ([a4bd520](https://github.com/kunchenguid/lavish-axi/commit/a4bd520bbbda62a06de6a8c592cd5aebdc5ef055))

## [0.1.27](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.26...lavish-axi-v0.1.27) (2026-06-11)


### Bug Fixes

* improve Lavish design fallback guidance ([#78](https://github.com/kunchenguid/lavish-axi/issues/78)) ([db9f294](https://github.com/kunchenguid/lavish-axi/commit/db9f2943a19ef626ccc233d7b4d66dafdf52cc51))

## [0.1.26](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.25...lavish-axi-v0.1.26) (2026-06-11)


### Bug Fixes

* **cli:** make interrupted poll guidance reliable ([#76](https://github.com/kunchenguid/lavish-axi/issues/76)) ([1a01e26](https://github.com/kunchenguid/lavish-axi/commit/1a01e2603a545bea773e5126beb653ba84d1a8b5))

## [0.1.25](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.24...lavish-axi-v0.1.25) (2026-06-11)


### Bug Fixes

* **cli:** improve poll and design guidance ([#74](https://github.com/kunchenguid/lavish-axi/issues/74)) ([302efac](https://github.com/kunchenguid/lavish-axi/commit/302efac1c73e486a01486dd394bc49f79fd8ae7b))

## [0.1.24](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.23...lavish-axi-v0.1.24) (2026-06-11)


### Features

* **cli:** guide agents to combine relevant playbooks ([#73](https://github.com/kunchenguid/lavish-axi/issues/73)) ([d0c6e47](https://github.com/kunchenguid/lavish-axi/commit/d0c6e47d9eaed2efb40c0a14a152ffb8f602900e))


### Bug Fixes

* Add Ctrl+Enter immediate-send shortcut to the annotation card ([#71](https://github.com/kunchenguid/lavish-axi/issues/71)) ([9922767](https://github.com/kunchenguid/lavish-axi/commit/9922767ca7f7eb5e4bec02345464fcf107fab42c))

## [0.1.23](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.22...lavish-axi-v0.1.23) (2026-06-10)


### Features

* **skill:** support /lavish invocation ([#67](https://github.com/kunchenguid/lavish-axi/issues/67)) ([cd87b1f](https://github.com/kunchenguid/lavish-axi/commit/cd87b1f057848b1114ad414e99c27808ad044222))

## [0.1.22](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.21...lavish-axi-v0.1.22) (2026-06-10)


### Features

* sync lavish design skill to v2 ([#65](https://github.com/kunchenguid/lavish-axi/issues/65)) ([d9cfc9d](https://github.com/kunchenguid/lavish-axi/commit/d9cfc9d42ae8a7875626878d10711cd20f23f2af))

## [0.1.21](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.20...lavish-axi-v0.1.21) (2026-06-10)


### Features

* **chrome:** align editor chrome with v2 UI ([#63](https://github.com/kunchenguid/lavish-axi/issues/63)) ([da6c19e](https://github.com/kunchenguid/lavish-axi/commit/da6c19ec4882024a55333adc83ca481ec16d09c8))

## [0.1.20](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.19...lavish-axi-v0.1.20) (2026-06-07)


### Features

* send on Enter in chat input and annotation card ([#58](https://github.com/kunchenguid/lavish-axi/issues/58)) ([e88679f](https://github.com/kunchenguid/lavish-axi/commit/e88679f6a02a3ba4fdd6424d569e34f919025077))
* **skills:** add installable Lavish agent skill ([#59](https://github.com/kunchenguid/lavish-axi/issues/59)) ([5f7cb2e](https://github.com/kunchenguid/lavish-axi/commit/5f7cb2e4263220ff38f63117ae6293616278fdf6))

## [0.1.19](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.18...lavish-axi-v0.1.19) (2026-06-05)


### Bug Fixes

* allow native form controls during annotation ([#56](https://github.com/kunchenguid/lavish-axi/issues/56)) ([e355502](https://github.com/kunchenguid/lavish-axi/commit/e355502fb312620108c2dcd38b4280a23e9e27e1))

## [0.1.18](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.17...lavish-axi-v0.1.18) (2026-05-27)


### Features

* **cli:** add server shutdown controls ([#54](https://github.com/kunchenguid/lavish-axi/issues/54)) ([33c5b45](https://github.com/kunchenguid/lavish-axi/commit/33c5b4549693d7c8fb5ca8dc59595dcf9377b4cd))

## [0.1.17](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.16...lavish-axi-v0.1.17) (2026-05-24)


### Features

* **cli:** broaden plan playbook guidance ([#52](https://github.com/kunchenguid/lavish-axi/issues/52)) ([aa533c4](https://github.com/kunchenguid/lavish-axi/commit/aa533c42c77a696ac0817402688b17cf29c5bdd5))

## [0.1.16](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.15...lavish-axi-v0.1.16) (2026-05-24)


### Bug Fixes

* **cli:** prioritize project design guidance ([#50](https://github.com/kunchenguid/lavish-axi/issues/50)) ([ee782c0](https://github.com/kunchenguid/lavish-axi/commit/ee782c04d737d888f9f3b3bae1916137d791516b))

## [0.1.15](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.14...lavish-axi-v0.1.15) (2026-05-23)


### Bug Fixes

* preserve artifact scroll on hot reload ([#48](https://github.com/kunchenguid/lavish-axi/issues/48)) ([81599a1](https://github.com/kunchenguid/lavish-axi/commit/81599a1f70ff08732b4a809e8634f5f4942b9d3b))

## [0.1.14](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.13...lavish-axi-v0.1.14) (2026-05-23)


### Bug Fixes

* **cli:** require explicit agent hook setup ([#46](https://github.com/kunchenguid/lavish-axi/issues/46)) ([4a250b8](https://github.com/kunchenguid/lavish-axi/commit/4a250b843edbe4204599526c753bc94b798c9785))

## [0.1.13](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.12...lavish-axi-v0.1.13) (2026-05-23)


### Bug Fixes

* support local artifact assets in hidden directories ([#44](https://github.com/kunchenguid/lavish-axi/issues/44)) ([2528e8e](https://github.com/kunchenguid/lavish-axi/commit/2528e8e571cfd0ed299be842df9943c56868f4ac))

## [0.1.12](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.11...lavish-axi-v0.1.12) (2026-05-16)


### Bug Fixes

* harden feedback polling and queued prompts ([#41](https://github.com/kunchenguid/lavish-axi/issues/41)) ([ec1e664](https://github.com/kunchenguid/lavish-axi/commit/ec1e6643533a01f93389532d382897b0451201ee))

## [0.1.11](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.10...lavish-axi-v0.1.11) (2026-05-15)


### Bug Fixes

* keep Lavish artifacts portable by default ([#40](https://github.com/kunchenguid/lavish-axi/issues/40)) ([6dc80bc](https://github.com/kunchenguid/lavish-axi/commit/6dc80bc6d411a19c48d14444d8aa2a13afdaf58f))
* **server:** prevent live reload watcher stalls ([#38](https://github.com/kunchenguid/lavish-axi/issues/38)) ([cc1c841](https://github.com/kunchenguid/lavish-axi/commit/cc1c8411d3410b591fd5d1de945ba93c889af0e7))

## [0.1.10](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.9...lavish-axi-v0.1.10) (2026-05-14)


### Bug Fixes

* **cli:** require polling before user replies ([#33](https://github.com/kunchenguid/lavish-axi/issues/33)) ([c23c86c](https://github.com/kunchenguid/lavish-axi/commit/c23c86c499cd16d7cf23ee7d48dca8ee7b74f174))

## [0.1.9](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.8...lavish-axi-v0.1.9) (2026-05-13)


### Bug Fixes

* **server:** track agent presence across polling states ([#31](https://github.com/kunchenguid/lavish-axi/issues/31)) ([351d7b4](https://github.com/kunchenguid/lavish-axi/commit/351d7b4174fb4f64b7683ea85a93537ecbb33ad3))

## [0.1.8](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.7...lavish-axi-v0.1.8) (2026-05-13)


### Bug Fixes

* trigger release ([9bbf27f](https://github.com/kunchenguid/lavish-axi/commit/9bbf27fe77f0e8baa656b577e27fc536d3c7474a))

## [0.1.7](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.6...lavish-axi-v0.1.7) (2026-05-12)


### Features

* add input feedback controls ([#17](https://github.com/kunchenguid/lavish-axi/issues/17)) ([8eda036](https://github.com/kunchenguid/lavish-axi/commit/8eda036cfd6604823fad4945f9970b32a40e520a))

## [0.1.6](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.5...lavish-axi-v0.1.6) (2026-05-12)


### Features

* **cli:** inject packaged design assets ([#16](https://github.com/kunchenguid/lavish-axi/issues/16)) ([2eb6170](https://github.com/kunchenguid/lavish-axi/commit/2eb61706823257a677bd8490e97bfe20a98080fa))


### Bug Fixes

* upgrade axi js sdk ([#14](https://github.com/kunchenguid/lavish-axi/issues/14)) ([dfb07f8](https://github.com/kunchenguid/lavish-axi/commit/dfb07f8862867f07e907c5ad975e14738c0992b2))

## [0.1.5](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.4...lavish-axi-v0.1.5) (2026-05-12)


### Features

* **cli:** add artifact guidance playbooks ([#12](https://github.com/kunchenguid/lavish-axi/issues/12)) ([b13f033](https://github.com/kunchenguid/lavish-axi/commit/b13f033973f91935af97e0688574a0767e66463b))

## [0.1.4](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.3...lavish-axi-v0.1.4) (2026-05-12)


### Features

* support text range annotations ([#10](https://github.com/kunchenguid/lavish-axi/issues/10)) ([dd0ed5c](https://github.com/kunchenguid/lavish-axi/commit/dd0ed5c1340e945ddd33ebb66317b5e28c78f3e6))


### Bug Fixes

* **cli:** restart stale servers after upgrades ([#6](https://github.com/kunchenguid/lavish-axi/issues/6)) ([d473557](https://github.com/kunchenguid/lavish-axi/commit/d4735576a0fb3933304a4c1394195b512d60ccda))

## [0.1.3](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.2...lavish-axi-v0.1.3) (2026-05-12)


### Bug Fixes

* metadata ([0ac6980](https://github.com/kunchenguid/lavish-axi/commit/0ac698092c94c0f7c91011ad58db2ddfe673a680))

## [0.1.2](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.1...lavish-axi-v0.1.2) (2026-05-12)


### Features

* **cli:** improve AXI home guidance ([#4](https://github.com/kunchenguid/lavish-axi/issues/4)) ([70b5a30](https://github.com/kunchenguid/lavish-axi/commit/70b5a30bd2c0cadb97068fa79da316db4a6895ec))


### Bug Fixes

* ignore changelog in prettier checks ([c18d955](https://github.com/kunchenguid/lavish-axi/commit/c18d955af9cf3892150fc207be783c1b0bc90a74))

## [0.1.1](https://github.com/kunchenguid/lavish-axi/compare/lavish-axi-v0.1.0...lavish-axi-v0.1.1) (2026-05-12)


### Features

* initial commit ([7f1fc95](https://github.com/kunchenguid/lavish-axi/commit/7f1fc957f9d24a5ebae38fdfe43ad3cb717929b7))


### Bug Fixes

* editor chrome refresh ([#2](https://github.com/kunchenguid/lavish-axi/issues/2)) ([68caaef](https://github.com/kunchenguid/lavish-axi/commit/68caaef46fadf767ed70bf215a5fe9bda44b3190))
