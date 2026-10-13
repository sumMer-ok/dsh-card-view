window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-workspace",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let _deepseek_ai_cordis = require("@deepseek-ai/cordis");
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/contract/slots.ts
		/**
		* Bind the row's render occurrence into the entries' `useMenuOpenState` hook:
		* the owner supplies its open-state pair as the occurrence's `hookContext`,
		* and the hook hands that pair back.
		* @param _standard - framework standard props (unused).
		* @param state - the menu's open-state pair from the render occurrence.
		* @returns the hook the entry calls.
		*/
		const menuOpenStateFactory = (_standard, state) => () => state;
		//#endregion
		//#region src/client/shortcuts.ts
		/**
		* Create the private browser request source shared by commands and controls.
		* @returns observable state and its complete mutation callbacks.
		*/
		function createWorkspaceShortcutControls() {
			const state = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)({
				searchRequest: 0,
				addRequested: false,
				directoryBusy: false,
				renameTarget: null,
				forkError: null
			});
			let forkErrorSeq = 0;
			return {
				state,
				search: () => {
					state.set({
						...state.getSnapshot(),
						searchRequest: state.getSnapshot().searchRequest + 1
					});
				},
				add: () => {
					state.set(state.getSnapshot().directoryBusy ? state.getSnapshot() : {
						...state.getSnapshot(),
						addRequested: true
					});
				},
				closeAdd: () => {
					state.set({
						...state.getSnapshot(),
						addRequested: false
					});
				},
				directoryBusy: (busy) => {
					state.set({
						...state.getSnapshot(),
						directoryBusy: busy
					});
				},
				rename: (sessionId, currentTitle) => {
					state.set({
						...state.getSnapshot(),
						renameTarget: {
							sessionId,
							currentTitle
						}
					});
				},
				closeRename: () => {
					state.set({
						...state.getSnapshot(),
						renameTarget: null
					});
				},
				forkFailed: (reason) => {
					forkErrorSeq += 1;
					state.set({
						...state.getSnapshot(),
						forkError: {
							reason,
							seq: forkErrorSeq
						}
					});
				},
				dismissForkError: () => {
					state.set({
						...state.getSnapshot(),
						forkError: null
					});
				}
			};
		}
		/**
		* Register navigation commands against the existing workspace owner.
		* Rename requires a nonblank main Conversation with no modal obscuring it.
		* @param ctx - plugin context with the shortcut, locale, and model services.
		* @param navigation - session creation and forking from the pointer controls' navigation service.
		* @param controls - browser-owned opening requests.
		* @param archiveSession - shared archive action, including running-work confirmation and notices.
		*/
		function installWorkspaceShortcuts(ctx, navigation, controls, archiveSession) {
			const t = ctx.locale.bind("workspace");
			const current = () => Object.values(ctx.sessions.list.getSnapshot().byId).find((row) => (row.retainedBy.mainView ?? 0) > 0);
			const addReason = () => ctx.slots.entries("sidebar.workspaces.directoryFlow").length === 0 ? t("shortcut.noPicker") : controls.state.getSnapshot().directoryBusy ? t("shortcut.directoryBusy") : null;
			const register = (id, label, aliases, code, modifiers, webModifiers, resolve) => {
				ctx.effect(() => ctx.shortcuts.register({
					id,
					label,
					aliases,
					defaults: {
						"desktop:macos": {
							code,
							modifiers
						},
						"desktop:windows": {
							code,
							modifiers
						},
						"desktop:linux": {
							code,
							modifiers
						},
						"web:macos": {
							code,
							modifiers: webModifiers
						},
						"web:windows": {
							code,
							modifiers: webModifiers
						}
					},
					regions: ["page", "editable"],
					modals: [],
					resolve
				}), `ui-workspace: ${id}`);
			};
			register("session.new", () => t("session.new"), ["new session", "new chat"], "KeyN", ["primary"], ["primary", "alt"], () => ({
				status: "handled",
				run: () => {
					navigation.startSession();
				}
			}));
			register("session.search", () => t("search.sessions.aria"), ["search sessions"], "KeyK", ["primary"], ["primary", "alt"], () => ({
				status: "handled",
				run: controls.search
			}));
			register("workspace.add", () => t("workspace.add"), ["add workspace", "open folder"], "KeyO", ["primary"], ["primary", "alt"], () => {
				const reason = addReason();
				return reason === null ? {
					status: "handled",
					run: controls.add
				} : {
					status: "blocked",
					reason
				};
			});
			register("session.rename", () => t("rename.session.title"), ["rename session"], "KeyG", ["primary", "alt"], ["primary", "alt"], (context) => {
				const target = current();
				return target === void 0 || target.blank || context.modal !== null || ctx.layout.panelInfo.getSnapshot().activePanelId !== null ? {
					status: "blocked",
					reason: t("shortcut.noSession")
				} : {
					status: "handled",
					run: () => {
						controls.rename(target.id, target.title?.trim() ?? "");
					}
				};
			});
			register("session.fork", () => t("menu.fork"), ["fork session"], "KeyF", ["primary", "alt"], ["primary", "shift"], () => {
				const target = current();
				if (target === void 0) return {
					status: "blocked",
					reason: t("shortcut.noSession")
				};
				if (target.blank) return {
					status: "blocked",
					reason: t("shortcut.noCompletedTurn")
				};
				return {
					status: "handled",
					run: () => {
						navigation.forkSession(target.id).catch((error) => {
							const unavailable = error instanceof Error && error.name === "SessionForkError" && error.rpcError.code === "session/fork-unavailable";
							controls.forkFailed(unavailable ? "unavailable" : "failed");
							if (!unavailable) console.warn("session fork rejected:", error);
						});
					}
				};
			});
			register("session.archive", () => t("menu.archiveSession"), ["archive session"], "KeyA", ["primary", "shift"], ["primary", "alt"], () => {
				const target = current();
				return target === void 0 ? {
					status: "blocked",
					reason: t("shortcut.noSession")
				} : {
					status: "handled",
					run: () => {
						archiveSession(target.id);
					}
				};
			});
		}
		//#endregion
		//#region ../../util/values/src/index.ts
		/**
		* Mark an unreachable closed-union branch.
		* @param value - impossible value; an unhandled typed variant fails at the call site.
		* @param context - optional switch-site label included in the failure message.
		* @returns never; a runtime value that escaped its type always throws.
		*/
		function assertNever$1(value, context) {
			const rendered = JSON.stringify(value) ?? String(value);
			throw new Error(`unreachable variant${context ? ` in ${context}` : ""}: ${rendered}`);
		}
		//#endregion
		//#region ../../util/workspace-path/src/index.ts
		/** Whether a path uses a Windows drive or UNC prefix. */
		function isWindowsStylePath(value) {
			return /^[A-Za-z]:[/\\]/.test(value) || value.startsWith("\\\\");
		}
		/**
		* Abbreviate a POSIX home directory for display.
		* @param path - Absolute or already-short display path.
		* @param home - Host account home; absent skips abbreviation.
		* @returns `~` or `~/…` for the POSIX home and its descendants, otherwise `path`.
		*/
		function abbreviateHomePath(path, home) {
			if (home === void 0 || home === "") return path;
			if (isWindowsStylePath(path) || isWindowsStylePath(home)) return path;
			const root = home.replace(/\/+$/, "");
			if (root === "" || root === "/") return path;
			if (path.replace(/\/+$/, "") === root) return "~";
			if (path.startsWith(`${root}/`)) return `~${path.slice(root.length)}`;
			return path;
		}
		/**
		* Read the final non-empty segment of a Workspace path for display.
		* Workspace-label surfaces use this helper instead of deriving another basename.
		* @param path - Workspace directory path using POSIX or Windows separators.
		* @returns the final segment, or an empty string for a separator-only path.
		*/
		function workspaceTitleOf(path) {
			const trimmed = path.replace(/[/\\]+$/, "");
			const separator = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
			return trimmed.slice(separator + 1);
		}
		/**
		* Resolve the Workspace browser group that owns one Session.
		* @param workspaces - authoritative Workspace membership.
		* @param sessionId - Session whose browser group is required.
		* @returns owning Workspace id, or {@link UNGROUPED_KEY} when no Workspace accounts for it.
		*/
		function owningGroupKey(workspaces, sessionId) {
			return workspaces.find((workspace) => workspace.sessionIds.includes(sessionId))?.workspaceId ?? "";
		}
		function mainSessionId(list) {
			return Object.values(list.byId).find((session) => (session.retainedBy.mainView ?? 0) > 0)?.id;
		}
		/**
		* Directory display label: basename of the path (both separators accepted).
		* Ungrouped-bucket fallback for surfaces without a workspace title.
		* @param cwd - directory path, or undefined for the ungrouped bucket.
		* @returns basename, the raw cwd when it has no basename, or an empty ungrouped marker.
		*/
		function workspaceLabel(cwd) {
			if (cwd === void 0 || cwd === "") return "";
			const base = workspaceTitleOf(cwd);
			return base !== "" ? base : cwd;
		}
		/**
		* Project known account members by current Session recency.
		* @param sessionIds - authoritative account membership.
		* @param summaries - current Session summaries; members without a summary are omitted until it arrives.
		* @returns known members newest first, with Session identity as the deterministic tie-break.
		*/
		function orderByRecency(sessionIds, summaries) {
			return sessionIds.flatMap((id) => {
				const summary = summaries[id];
				if (summary === void 0) return [];
				return [{
					id,
					rank: summary.updatedAt
				}];
			}).sort((a, b) => {
				if (a.rank !== b.rank) return b.rank - a.rank;
				return a.id < b.id ? -1 : 1;
			}).map((member) => member.id);
		}
		/**
		* Reconcile a browser-local manual order with current account membership.
		* New ordinary forks precede their sources without changing saved entries' relative order.
		* @param memberIds - authoritative account membership.
		* @param savedOrder - previously saved browser-local order.
		* @param summaries - current Session metadata; unknown new members wait for their summaries.
		* @param rowState - global pin and archive membership; only account members can supplement the order.
		* @returns saved relative positions plus missing members ordered by pin, fork source, recency, and archive status.
		*/
		function reconcileManualOrder(memberIds, savedOrder, summaries, rowState) {
			const members = new Map(memberIds.map((id) => [id, id]));
			const included = /* @__PURE__ */ new Set();
			const ordered = [];
			for (const key of savedOrder ?? []) {
				const id = members.get(key);
				if (id === void 0 || included.has(key)) continue;
				ordered.push(id);
				included.add(key);
			}
			const archived = new Set(rowState?.archivedSessionIds);
			const pins = [];
			for (const sessionId of rowState?.pinnedSessionIds ?? []) {
				const id = members.get(sessionId);
				if (id === void 0 || included.has(id) || archived.has(id) || summaries[id] === void 0) continue;
				pins.push(id);
				included.add(id);
			}
			const ordinary = [];
			const archives = [];
			for (const id of orderByRecency([...members.values()].filter((id) => !included.has(id)), summaries)) if (archived.has(id)) archives.push(id);
			else ordinary.push(id);
			const result = [
				...pins,
				...ordered,
				...ordinary,
				...archives
			];
			const pending = new Set(ordinary);
			const placeFork = (id) => {
				if (!pending.delete(id)) return;
				const parentId = summaries[id]?.parentId;
				if (parentId === void 0 || parentId === id || !result.includes(parentId)) return;
				placeFork(parentId);
				result.splice(result.indexOf(id), 1);
				result.splice(result.indexOf(parentId), 0, id);
			};
			for (const id of [...ordinary].reverse()) placeFork(id);
			return result;
		}
		/**
		* Keep the selected provisional New Session ahead of either base order.
		* @param order - recency or reconciled manual order.
		* @param currentBlank - selected blank Session in this account, when present.
		* @returns a copy with the selected blank first and no duplicate slot.
		*/
		function pinCurrentBlank(order, currentBlank) {
			if (currentBlank === void 0) return [...order];
			return [currentBlank, ...order.filter((id) => id !== currentBlank)];
		}
		/**
		* Ordinary sessions are visible; among blank sessions, only the current one
		* is visible. Subagent children use their parent header catalog; archived
		* sessions follow the archived filter, while their accounting slots remain
		* either way so unarchiving restores position.
		*/
		function sessionVisible(session, current, archived, archivedFilter) {
			if (session.origin === "subagent") return false;
			if (session.blank && session.id !== current) return false;
			switch (archivedFilter) {
				case "default": return !archived.has(session.id);
				case "show": return true;
				case "only": return archived.has(session.id);
				/* v8 ignore next 2 -- closed-union backstop; only reached if the filter is forged */
				default: return assertNever$1(archivedFilter);
			}
		}
		/**
		* Keep the visible New Session placeholder first, then partition pinned and
		* ordinary rows without changing either partition's caller order.
		*/
		function sectionMembers(members, pinned, archived) {
			const placeholders = [];
			const leading = [];
			const rest = [];
			for (const member of members) if (member.blank) placeholders.push(member);
			else if (!archived.has(member.id) && pinned.has(member.id)) leading.push(member);
			else rest.push(member);
			return [
				...placeholders,
				...leading,
				...rest
			];
		}
		/**
		* A blank session is the selected Workspace's provisional New Session row;
		* its canonical title never enters search (blank rows are query-excluded)
		* and the renderer localizes its display label. Unnamed history also yields an
		* empty title for localization and does not match a directory-name title search.
		*/
		function sessionTitle(session) {
			return session.blank ? "" : session.title?.trim() ?? "";
		}
		/** Build one group without projecting session lineage into presentation. */
		function buildGroup(key, workspaceId, cwd, createdAt, label, members) {
			return {
				key,
				workspaceId,
				cwd,
				createdAt,
				label,
				sessions: [...members]
			};
		}
		/** Apply a stored Ungrouped order and append newly loose Sessions by recency. */
		function orderedUngrouped(members, stored, summaries) {
			const byId = new Map(members.map((session) => [session.id, session]));
			return (stored === void 0 ? orderByRecency(members.map((session) => session.id), summaries) : reconcileManualOrder(members.map((session) => session.id), stored, summaries)).flatMap((id) => {
				const session = byId.get(id);
				/* v8 ignore next -- ids are projected exclusively from the members used to build byId. */
				return session === void 0 ? [] : [session];
			});
		}
		/**
		* Group Sessions by Workspace: one group per caller-ordered entity, with
		* members resolved from caller-ordered sessionIds. Sessions outside every
		* Workspace trail in the browser-local Ungrouped order, which falls back to
		* recency before that order is initialized.
		*/
		function groupByWorkspace(list, workspaces, archived, archivedFilter, ungroupedOrder) {
			const current = mainSessionId(list);
			const groups = [];
			const accounted = /* @__PURE__ */ new Set();
			for (const workspace of workspaces) {
				const members = [];
				for (const id of workspace.sessionIds) {
					const summary = list.byId[id];
					if (summary === void 0) continue;
					accounted.add(id);
					if (!sessionVisible(summary, current, archived, archivedFilter)) continue;
					members.push(summary);
				}
				if (archivedFilter === "only" && members.length === 0) continue;
				groups.push(buildGroup(workspace.workspaceId, workspace.workspaceId, workspace.path, Date.parse(workspace.createdAt), workspace.title, members));
			}
			const stray = list.ids.map((id) => list.byId[id]).filter((s) => s !== void 0 && !accounted.has(s.id) && sessionVisible(s, current, archived, archivedFilter));
			if (stray.length > 0) groups.push(buildGroup("", void 0, void 0, void 0, "", orderedUngrouped(stray, ungroupedOrder, list.byId)));
			return groups;
		}
		/** Keep navigation presentation independent from domain-owned interaction objects. */
		function visiblePendingKind(kind) {
			switch (kind) {
				case "approval":
				case "plan-review":
				case "question": return kind;
				default: return;
			}
		}
		function runningChildCount(list, parentId, statuses) {
			return list.projectionsBySession[parentId]?.values.subagentCatalog?.reduce((count, child) => count + ((statuses.get(child.id)?.running ?? list.byId[child.id]?.running) === true ? 1 : 0), 0) ?? 0;
		}
		function sessionNode(s, list, statuses, pinned, archived) {
			const status = statuses.get(s.id);
			const pendingInteraction = visiblePendingKind(status?.pendingInteraction?.kind);
			return {
				id: s.id,
				title: sessionTitle(s),
				blank: s.blank,
				running: status?.running ?? s.running,
				runningSubagentCount: runningChildCount(list, s.id, statuses),
				completed: status?.completionUnread === true,
				pinned: !archived.has(s.id) && pinned.has(s.id),
				archived: archived.has(s.id),
				updatedAt: s.updatedAt,
				...pendingInteraction === void 0 ? {} : { pendingInteraction }
			};
		}
		/**
		* Derive the workspace browser groups with every session as a top-level row.
		*
		* Every group shows, except that the archived-only filter drops groups
		* without visible members; sessions populate under expanded groups with
		* pinned rows leading in the selected local order. Blank sessions are
		* excluded except for the selected provisional New Session row; archived
		* sessions keep their slots and appear per the archived filter. Content
		* search lives outside this derivation (see {@link deriveSearchResults}).
		* @param list - sessions list snapshot (`mainView` retention feeds containsCurrent).
		* @param workspaces - real Workspaces in Host group order with caller-projected Session order.
		* @param rowState - registry-global pin and archive sets plus the archived filter.
		* @param statuses - unified UI status by Session.
		* @param view - local expansion arrays.
		* @returns group sections in render order.
		*/
		function deriveGroups(list, workspaces, rowState, statuses, view) {
			const archived = new Set(rowState.archivedSessionIds);
			const pinned = new Set(rowState.pinnedSessionIds);
			const expandedGroups = new Set(view.expandedGroups);
			const current = mainSessionId(list);
			const currentGroup = current === void 0 ? void 0 : owningGroupKey(workspaces, current);
			const groups = [];
			for (const g of groupByWorkspace(list, workspaces, archived, rowState.archivedFilter, view.ungroupedOrder)) {
				const expanded = expandedGroups.has(g.key);
				groups.push({
					key: g.key,
					workspaceId: g.workspaceId,
					cwd: g.cwd,
					createdAt: g.createdAt,
					label: g.label,
					sessionCount: g.sessions.length,
					expanded,
					containsCurrent: g.key === currentGroup,
					sessions: expanded ? sectionMembers(g.sessions, pinned, archived).map((session) => sessionNode(session, list, statuses, pinned, archived)) : []
				});
			}
			return groups;
		}
		/**
		* Select complete flat-list membership, independently of archive visibility.
		* @param list - sessions list snapshot.
		* @returns known ordinary Session ids, including archives and only the current blank.
		*/
		function sessionMemberIds(list) {
			return visibleSessionIds(list, [], "show");
		}
		/**
		* Select visible flat-list members without deriving row presentation or ordering.
		* @param list - sessions list snapshot.
		* @param archivedSessionIds - registry-global archive set.
		* @param archivedFilter - archived-row visibility choice.
		* @returns known visible Session ids in list order, including ordinary forks and only the current blank.
		*/
		function visibleSessionIds(list, archivedSessionIds, archivedFilter) {
			const archived = new Set(archivedSessionIds);
			const current = mainSessionId(list);
			return list.ids.filter((id) => {
				const s = list.byId[id];
				return s !== void 0 && sessionVisible(s, current, archived, archivedFilter);
			});
		}
		/**
		* Derive flat rows from the browser's complete ordered Session ids, with
		* pinned rows fronted ahead of the supplied order.
		* @param list - sessions list snapshot used to select the ids.
		* @param sessionIds - complete account members in the selected order, including hidden archives.
		* @param rowState - registry-global pin and archive sets plus the archived filter.
		* @param statuses - unified UI status by Session.
		* @returns flat rows in sectioned order with current status indicators.
		*/
		function deriveFlat(list, sessionIds, rowState, statuses) {
			const archived = new Set(rowState.archivedSessionIds);
			const pinned = new Set(rowState.pinnedSessionIds);
			const current = mainSessionId(list);
			return sectionMembers(sessionIds.flatMap((id) => {
				const session = list.byId[id];
				return session !== void 0 && sessionVisible(session, current, archived, rowState.archivedFilter) ? [session] : [];
			}), pinned, archived).map((session) => sessionNode(session, list, statuses, pinned, archived));
		}
		/**
		* Merge immediate title/Workspace substring matches with ranked Host content
		* matches. Local rows lead newest-first, content-only rows retain backend
		* order, and duplicate sessions receive the backend snippet in place.
		* @param list - session metadata authority.
		* @param workspaces - Workspace membership and display labels.
		* @param query - caller text; surrounding whitespace is ignored.
		* @param archivedSessionIds - registry-global archive set (members match per the archived filter).
		* @param archivedFilter - archived-row visibility choice; search follows it.
		* @param statuses - unified UI status by Session.
		* @param content - ranked Host content-search page.
		* @param limit - protocol-owned maximum merged row count.
		* @returns bounded deduplicated flat rows and a refine-query hint bit.
		*/
		function deriveSearchResults(list, workspaces, query, archivedSessionIds, archivedFilter, statuses, content, limit) {
			const q = query.trim().toLowerCase();
			if (q === "") return {
				items: [],
				hasMore: false
			};
			const archived = new Set(archivedSessionIds);
			const current = mainSessionId(list);
			const workspaceBySession = /* @__PURE__ */ new Map();
			for (const workspace of workspaces) for (const sessionId of workspace.sessionIds) if (!workspaceBySession.has(sessionId)) workspaceBySession.set(sessionId, workspace.title);
			const labelOf = (summary) => workspaceBySession.get(summary.id) ?? workspaceLabel(summary.cwd);
			const contentBySession = /* @__PURE__ */ new Map();
			for (const item of content.items) if (!contentBySession.has(item.sessionId)) contentBySession.set(item.sessionId, item);
			const local = [];
			for (const id of list.ids) {
				const summary = list.byId[id];
				if (summary === void 0 || summary.blank || !sessionVisible(summary, current, archived, archivedFilter)) continue;
				if (sessionTitle(summary).toLowerCase().includes(q) || labelOf(summary).toLowerCase().includes(q)) local.push(summary);
			}
			const localById = new Map(local.map((summary) => [summary.id, summary]));
			const orderedLocal = orderByRecency(local.map((summary) => summary.id), list.byId).map((id) => localById.get(id));
			const ordered = [];
			const included = /* @__PURE__ */ new Set();
			const include = (summary) => {
				if (included.has(summary.id)) return;
				included.add(summary.id);
				ordered.push(summary);
			};
			for (const summary of orderedLocal) include(summary);
			for (const item of content.items) {
				const summary = list.byId[item.sessionId];
				if (summary !== void 0 && !summary.blank && sessionVisible(summary, current, archived, archivedFilter)) include(summary);
			}
			return {
				items: ordered.slice(0, limit).map((summary) => {
					const match = contentBySession.get(summary.id);
					const status = statuses.get(summary.id);
					const pendingInteraction = visiblePendingKind(status?.pendingInteraction?.kind);
					return {
						id: summary.id,
						title: sessionTitle(summary),
						workspace: labelOf(summary),
						running: status?.running ?? summary.running,
						runningSubagentCount: runningChildCount(list, summary.id, statuses),
						...pendingInteraction === void 0 ? {} : { pendingInteraction },
						completed: status?.completionUnread === true,
						archived: archived.has(summary.id),
						...match === void 0 ? {} : { snippet: match.snippet }
					};
				}),
				hasMore: content.hasMore || ordered.length > limit
			};
		}
		/** Normalize separators for comparison without interpreting POSIX backslashes as separators. */
		function folderPath(path) {
			return (/^[A-Za-z]:[/\\]/.test(path) || path.startsWith("\\\\") ? path.replaceAll("\\", "/") : path).replace(/\/+$/, "");
		}
		/**
		* Find the nearest registered ancestor, excluding the Workspace directory itself.
		* Paths use Host spelling; matching is case-sensitive, like Workspace identity.
		* @param path - Workspace directory.
		* @param parents - registered Workspace directory paths.
		* @returns the owning parent path, or undefined when no parent contains the Workspace.
		*/
		function owningParentFolder(path, parents) {
			const child = folderPath(path);
			let owner;
			let length = -1;
			for (const parent of parents) {
				const root = folderPath(parent);
				if (root.length > length && child !== root && child.startsWith(`${root}/`)) {
					owner = parent;
					length = root.length;
				}
			}
			return owner;
		}
		//#endregion
		//#region src/client/themes.ts
		/**
		* Theme colors in creation order (red through violet), read as a cycle once an
		* account owns more themes than the sequence has steps.
		*/
		const THEME_COLORS = [
			"#ef5350",
			"#fb8c00",
			"#fbc02d",
			"#66bb6a",
			"#26c6da",
			"#42a5f5",
			"#ab47bc"
		];
		/** Menu entry naming the unthemed choice, distinct from any `theme:<id>` entry. */
		const THEME_NONE_ENTRY = "theme.none";
		/** Menu entry opening the browser-owned new-theme dialog. */
		const THEME_NEW_ENTRY = "theme.new";
		/** Menu entry id prefix carrying a real theme id. */
		const THEME_ENTRY_PREFIX = "theme:";
		/** Section key of an account's unthemed tail; not a legal theme id. */
		const UNTHEMED_THEME_KEY = "__unthemed__";
		/**
		* Color of one theme's rainbow slot.
		* @param colorSlot - the theme's creation-order slot.
		* @returns the hex color, wrapped into the sequence for a slot past its end.
		*/
		function themeColor(colorSlot) {
			const count = THEME_COLORS.length;
			return THEME_COLORS[(colorSlot % count + count) % count];
		}
		/**
		* Next free rainbow slot for one account. Slots are never reused, so deleting
		* a theme leaves every surviving theme's color where it was.
		* @param themes - the account's themes in creation order.
		* @returns one past the highest used slot, or 0 for an empty account.
		*/
		function nextColorSlot(themes) {
			return themes.reduce((next, theme) => Math.max(next, theme.colorSlot + 1), 0);
		}
		/**
		* Id of a theme, derived from its account and slot. A slot is never reused by
		* a live theme, so the id is unique within the account that stores it.
		* @param accountKey - the owning project folder account (a Workspace id, or
		* the ungrouped key for Sessions outside every Workspace).
		* @param colorSlot - the theme's creation-order slot.
		* @returns the theme id.
		*/
		function createThemeId(accountKey, colorSlot) {
			return `${THEME_ENTRY_PREFIX}${accountKey}:${colorSlot}`;
		}
		/**
		* Whether a name is already taken inside one account. Comparison ignores
		* surrounding whitespace and letter case, so a rename cannot produce two
		* themes a user reads as the same name.
		* @param themes - the account's themes in creation order.
		* @param name - the candidate name (already trimmed by the caller).
		* @param exceptId - the theme being renamed, excluded from the comparison.
		* @returns true when another theme of this account carries the name.
		*/
		function themeNameTaken(themes, name, exceptId) {
			const candidate = name.trim().toLowerCase();
			return themes.some((theme) => theme.id !== exceptId && theme.name.trim().toLowerCase() === candidate);
		}
		/**
		* Split one account's Sessions into theme sections: one per theme that still
		* has members, in theme creation order, followed by the unthemed tail. A
		* Session whose assignment names no live theme of this account reads as
		* unthemed, which is what a deleted theme and a Session moved out of its
		* project folder leave behind. Each section keeps the incoming order, so the
		* order accounts and the applied sort stay authoritative.
		* @param sessions - the account's visible Session nodes, in render order.
		* @param themes - the account's themes in creation order.
		* @param assigned - theme id per Session id; an absent entry means unthemed.
		* @returns the sections to render, empty when there is nothing to show.
		*/
		function deriveThemeSections(sessions, themes, assigned) {
			if (sessions.length === 0) return [];
			const owned = new Set(themes.map((theme) => theme.id));
			const byTheme = /* @__PURE__ */ new Map();
			const unthemed = [];
			for (const session of sessions) {
				const themeId = assigned[session.id];
				if (themeId === void 0 || !owned.has(themeId)) {
					unthemed.push(session);
					continue;
				}
				const members = byTheme.get(themeId);
				if (members === void 0) byTheme.set(themeId, [session]);
				else members.push(session);
			}
			const sections = [];
			for (const theme of themes) {
				const members = byTheme.get(theme.id);
				if (members === void 0) continue;
				sections.push({
					key: theme.id,
					theme,
					sessions: members
				});
			}
			if (unthemed.length > 0) sections.push({
				key: UNTHEMED_THEME_KEY,
				theme: null,
				sessions: unthemed
			});
			return sections;
		}
		//#endregion
		//#region src/client/stores.ts
		/**
		* The workspace browser's viewing store: the session-list grouping mode,
		* persisted across reloads. Module level exports the factory only (a
		* module-level handle would pin the store identity across plugin reloads);
		* register() receives the factory and the browser derives its PropsStore
		* share from the return type.
		*/
		/** Browser-local order account for the hierarchy-free flat Session list. */
		const FLAT_SESSION_ORDER_KEY = "__flat_session_order__";
		/** Copy read-only projections into the persisted mutable store representation. */
		function copySessionOrders(orders) {
			return Object.fromEntries(Object.entries(orders).map(([key, order]) => [key, [...order]]));
		}
		/**
		* Create the workspace browser viewing store handle.
		* @returns the store handle (spec + type + identity + factory in one).
		*/
		function createWorkspaceViewStore() {
			return (0, _deepseek_ai_dsh_client_store.defineStore)({
				init: () => ({
					groupBy: "workspace",
					orderBy: "updated",
					groupExpansion: {},
					sessionOrderByAccount: {},
					archivedFilter: "default",
					workspaceColor: {},
					workspacePinned: {},
					themes: {},
					sessionTheme: {}
				}),
				persist: "dsh.workspace.view.v6",
				actions: {
					setGroupBy: (d, mode) => {
						d.groupBy = mode;
					},
					setOrderBy: (d, mode, initialOrders) => {
						if (mode === d.orderBy) return;
						d.sessionOrderByAccount = mode === "manual" ? copySessionOrders(initialOrders) : {};
						d.orderBy = mode;
					},
					setGroupExpanded: (d, key, expanded) => {
						d.groupExpansion[key] = expanded;
					},
					retainAccountKeys: (d, workspaceKeys) => {
						const retained = new Set(workspaceKeys);
						d.groupExpansion = Object.fromEntries(Object.entries(d.groupExpansion).filter(([key]) => retained.has(key)));
						d.sessionOrderByAccount = Object.fromEntries(Object.entries(d.sessionOrderByAccount).filter(([key]) => retained.has(key)));
						d.themes = Object.fromEntries(Object.entries(d.themes).filter(([key]) => retained.has(key)));
						d.workspaceColor = Object.fromEntries(Object.entries(d.workspaceColor ?? {}).filter(([key]) => retained.has(key)));
						d.workspacePinned = Object.fromEntries(Object.entries(d.workspacePinned ?? {}).filter(([key]) => retained.has(key)));
						delete d.sessionUpdatedAtByAccount;
					},
					syncSessionOrders: (d, orders) => {
						if (d.orderBy !== "manual") return;
						Object.assign(d.sessionOrderByAccount, copySessionOrders(orders));
					},
					setSessionOrder: (d, accountKey, order, initialOrders) => {
						if (d.orderBy === "updated") d.sessionOrderByAccount = copySessionOrders(initialOrders);
						else Object.assign(d.sessionOrderByAccount, copySessionOrders(initialOrders));
						d.orderBy = "manual";
						d.sessionOrderByAccount[accountKey] = [...order];
					},
					pinSessionOrder: (d, sessionId, accountKeys, source) => {
						const selected = new Set(accountKeys);
						d.sessionOrderByAccount = Object.fromEntries(Object.entries(source.members).map(([key, members]) => {
							const order = reconcileManualOrder(members, d.sessionOrderByAccount[key], source.summaries, source.rowState);
							return [key, selected.has(key) ? [sessionId, ...order.filter((id) => id !== sessionId)] : order];
						}));
					},
					setArchivedFilter: (d, filter) => {
						d.archivedFilter = filter;
					},
					setWorkspaceColor: (d, workspaceId, color) => {
						d.workspaceColor = Object.fromEntries(Object.entries(d.workspaceColor ?? {}).filter(([key]) => key !== workspaceId || color !== void 0));
						if (color !== void 0) d.workspaceColor[workspaceId] = color;
					},
					setWorkspacePinned: (d, workspaceId, pinned) => {
						d.workspacePinned = Object.fromEntries(Object.entries(d.workspacePinned ?? {}).filter(([key]) => key !== workspaceId || pinned));
						if (pinned) d.workspacePinned[workspaceId] = true;
					},
					createTheme: (d, accountKey, name) => {
						const themes = d.themes[accountKey] ?? [];
						const colorSlot = nextColorSlot(themes);
						d.themes[accountKey] = [...themes, {
							id: createThemeId(accountKey, colorSlot),
							name,
							colorSlot
						}];
					},
					renameTheme: (d, accountKey, themeId, name) => {
						const themes = d.themes[accountKey];
						if (themes === void 0) return;
						d.themes[accountKey] = themes.map((theme) => theme.id === themeId ? {
							...theme,
							name
						} : theme);
					},
					deleteTheme: (d, accountKey, themeId) => {
						const themes = d.themes[accountKey];
						if (themes !== void 0) {
							const remaining = themes.filter((theme) => theme.id !== themeId);
							if (remaining.length === 0) delete d.themes[accountKey];
							else d.themes[accountKey] = remaining;
						}
						d.sessionTheme = Object.fromEntries(Object.entries(d.sessionTheme).filter(([, assigned]) => assigned !== themeId));
					},
					assignSessionTheme: (d, sessionId, themeId) => {
						if (themeId === void 0) {
							d.sessionTheme = Object.fromEntries(Object.entries(d.sessionTheme).filter(([key]) => key !== sessionId));
							return;
						}
						d.sessionTheme[sessionId] = themeId;
					}
				}
			});
		}
		//#endregion
		//#region src/client/pin-order.ts
		/**
		* Every account's complete membership: each Workspace, Ungrouped, and the flat list.
		* @param workspaces - current Host Workspaces.
		* @param list - current Session list snapshot.
		* @param rowState - registry-global pin and archive sets.
		* @returns the order source for one pin write.
		*/
		function pinOrderSource(workspaces, list, rowState) {
			const accounted = new Set(workspaces.flatMap((workspace) => workspace.sessionIds));
			return {
				members: Object.fromEntries([
					...workspaces.map((workspace) => [workspace.workspaceId, workspace.sessionIds]),
					["", list.ids.filter((id) => list.byId[id] !== void 0 && !accounted.has(id))],
					[FLAT_SESSION_ORDER_KEY, sessionMemberIds(list)]
				]),
				summaries: list.byId,
				rowState
			};
		}
		/**
		* The accounts a pinned Session leads: its group (or Ungrouped) and the flat list.
		* @param workspaces - current Host Workspaces.
		* @param sessionId - the Session being pinned.
		* @returns the account keys `pinSessionOrder` fronts.
		*/
		function pinOrderAccounts(workspaces, sessionId) {
			return [owningGroupKey(workspaces, sessionId), FLAT_SESSION_ORDER_KEY];
		}
		//#endregion
		//#region src/client/navigation.ts
		/** Workspace archive and directory UI capability. */
		/** Structured directory failure exposed to directory UI consumers. */
		var DirectoryBrowseError = class extends Error {
			rpcError;
			name = "DirectoryBrowseError";
			/** @param rpcError - Host directory business failure. */
			constructor(rpcError) {
				super(`directory browse failed: ${rpcError.code}: ${rpcError.message}`);
				this.rpcError = rpcError;
			}
		};
		/** Implements Workspace archive and directory UI operations. */
		var UiWorkspaceService = class extends _deepseek_ai_cordis.Service {
			directoryPicker;
			workspaces;
			sessions;
			view;
			notify;
			connecting = /* @__PURE__ */ new Map();
			lifetime = new AbortController();
			selection = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)({}, { persist: { name: "dsh.sessions.current" } });
			mainReference;
			/**
			* @param ctx - Client root Context.
			* @param directoryPicker - the directory-picking Remote namespace.
			* @param workspaces - pure Workspace Controller.
			* @param sessions - pure Session Controller.
			* @param view - the browser's viewing-store write set (one instance shared with its registration).
			* @param notify - show one notice through the Workspace notice channel.
			*/
			constructor(ctx, directoryPicker, workspaces, sessions, view, notify) {
				super(ctx, "uiWorkspace");
				this.directoryPicker = directoryPicker;
				this.workspaces = workspaces;
				this.sessions = sessions;
				this.view = view;
				this.notify = notify;
				ctx.effect(() => {
					const stop = this.watchNavigation();
					return () => {
						stop();
						this.lifetime.abort();
						const reference = this.mainReference;
						this.mainReference = void 0;
						reference?.release();
					};
				}, "ui-workspace: Workspace navigation policy");
			}
			async connectWorkspace(workspaceId) {
				const workspace = this.workspaces.list.getSnapshot().items.find((item) => item.workspaceId === workspaceId);
				if (workspace === void 0) throw new Error(`uiWorkspace.connectWorkspace: unknown workspace ${workspaceId}`);
				const inflight = this.connecting.get(workspaceId);
				if (inflight !== void 0) return inflight;
				const attempt = this.reuseOrCreateBlank(workspace).finally(() => {
					this.connecting.delete(workspaceId);
				});
				this.connecting.set(workspaceId, attempt);
				return attempt;
			}
			reuseOrCreateBlank(workspace) {
				const archived = this.workspaces.list.getSnapshot().archivedSessionIds;
				const sessions = this.sessions.list.getSnapshot();
				for (const id of sessions.ids) {
					const summary = sessions.byId[id];
					if (summary === void 0 || !summary.blank || summary.cwd !== workspace.path || !workspace.sessionIds.includes(id) || archived.includes(id)) continue;
					return this.reuseBlank(workspace.workspaceId, id);
				}
				return this.sessions.create({ workspaceId: workspace.workspaceId });
			}
			async reuseBlank(workspaceId, sessionId) {
				try {
					return await this.sessions.create({
						workspaceId,
						sessionId
					});
				} catch (error) {
					if (sessionCreateErrorOf(error)?.rpcError.code !== "session/writer-held") throw error;
					return this.sessions.create({ workspaceId });
				}
			}
			openSession(target) {
				this.replaceMain(target, this.lifetime.signal, "reveal");
			}
			async openWorkspace(workspaceId, beforeOpen) {
				const navigation = AbortSignal.any([this.ctx.layout.beginNavigation(), this.lifetime.signal]);
				let sessionId;
				try {
					sessionId = await this.connectWorkspace(workspaceId);
				} catch (error) {
					if (!navigation.aborted) this.notify({
						kind: "createFailed",
						message: creationFailureMessage(error)
					});
					throw error;
				}
				if (navigation.aborted) return;
				this.replaceMain(sessionId, navigation, "reveal", beforeOpen);
			}
			async forkSession(sessionId, onCreated) {
				return this.sessions.fork({
					sessionId,
					increaseTitle: true,
					...onCreated === void 0 ? {} : { onCreated }
				});
			}
			startSession(workspaceId) {
				const workspace = this.workspaces.list.getSnapshot();
				const sessions = this.sessions.list.getSnapshot();
				const current = this.mainReference?.sessionId;
				const currentWorkspaceId = current === void 0 ? void 0 : workspace.items.find((item) => item.sessionIds.includes(current))?.workspaceId;
				const recent = workspace.phase === "ready" && sessions.phase === "ready" ? recentWorkspace(workspace.items, sessions.byId) : void 0;
				const target = workspaceId ?? currentWorkspaceId ?? recent;
				if (target === void 0) {
					this.clearMain();
					return;
				}
				this.openWorkspace(target).catch((reason) => {
					console.warn("new session failed:", reason);
				});
			}
			async archiveSession(sessionId, options = {}) {
				await this.workspaces.archiveSession(sessionId, options);
				if (this.mainReference?.sessionId === sessionId) this.clearMain();
			}
			async unarchiveSession(sessionId) {
				await this.workspaces.unarchiveSession(sessionId);
			}
			async pinSession(sessionId) {
				await this.workspaces.pinSession(sessionId);
				const { items, pinnedSessionIds, archivedSessionIds } = this.workspaces.list.getSnapshot();
				this.view.pinSessionOrder(sessionId, pinOrderAccounts(items, sessionId), pinOrderSource(items, this.sessions.list.getSnapshot(), {
					pinnedSessionIds,
					archivedSessionIds
				}));
			}
			async unpinSession(sessionId) {
				await this.workspaces.unpinSession(sessionId);
			}
			async pickDirectory() {
				const result = await this.directoryPicker.pick();
				if (!result.ok) throw new Error(`directory picker failed: ${result.error.message}`);
				return result.value;
			}
			async listDirectory(path, signal) {
				const result = await this.directoryPicker.list(path, signal);
				if (!result.ok) throw new DirectoryBrowseError(result.error);
				return result.value;
			}
			async createDirectory(path, name) {
				const result = await this.directoryPicker.createDirectory(path, name);
				if (!result.ok) throw new DirectoryBrowseError(result.error);
				return result.value;
			}
			watchNavigation() {
				let initial = "waiting";
				const reconcile = () => {
					if (this.lifetime.signal.aborted) return;
					if (this.clearArchivedCurrent()) return;
					if (initial !== "waiting") return;
					const workspace = this.workspaces.list.getSnapshot();
					const sessions = this.sessions.list.getSnapshot();
					if (workspace.phase !== "ready" || sessions.phase !== "ready") return;
					if (this.mainReference !== void 0) {
						initial = "done";
						return;
					}
					initial = "connecting";
					this.restoreSelection(workspace, sessions).then(() => {
						initial = "done";
					}, (reason) => {
						if (this.lifetime.signal.aborted) return;
						initial = "waiting";
						console.warn("initial Session restoration failed:", reason);
					});
				};
				const disposeWorkspaces = this.workspaces.list.subscribe(reconcile);
				const disposeSessions = this.sessions.list.subscribe(reconcile);
				reconcile();
				return () => {
					this.lifetime.abort();
					disposeSessions();
					disposeWorkspaces();
				};
			}
			async restoreSelection(workspaces, sessions) {
				const saved = this.selection.getSnapshot();
				if (saved.subagentAddress !== void 0) {
					this.replaceMain(saved.subagentAddress, this.lifetime.signal, "preserve");
					return;
				}
				const summary = saved.sessionId === void 0 ? void 0 : sessions.byId[saved.sessionId];
				const workspace = summary === void 0 ? void 0 : workspaces.items.find((item) => item.sessionIds.includes(summary.id));
				if (summary !== void 0 && (!summary.blank || workspace === void 0)) {
					this.replaceMain(summary.id, this.lifetime.signal, "preserve");
					return;
				}
				const navigation = AbortSignal.any([this.ctx.layout.beginNavigation(), this.lifetime.signal]);
				let sessionId;
				if (summary !== void 0 && workspace !== void 0 && summary.cwd === workspace.path && !workspaces.archivedSessionIds.includes(summary.id)) sessionId = await this.reuseBlank(workspace.workspaceId, summary.id);
				let target = workspace?.workspaceId ?? recentWorkspace(workspaces.items, sessions.byId);
				if (target === void 0 && workspaces.items.length === 0 && sessions.ids.length === 0) {
					const prepared = await this.initializeDefaultWorkspace(navigation);
					if (navigation.aborted) return;
					target = prepared?.workspaceId;
				}
				if (sessionId === void 0 && target !== void 0) sessionId = await this.connectWorkspace(target);
				if (sessionId !== void 0 && !navigation.aborted) this.replaceMain(sessionId, navigation, "preserve");
			}
			async initializeDefaultWorkspace(signal) {
				try {
					return await this.workspaces.initializeDefault(signal);
				} catch (_error) {
					if (!signal.aborted) this.notify({ kind: "defaultWorkspaceFailed" });
					return;
				}
			}
			/** @returns true when an archived current selection was cleared. */
			clearArchivedCurrent() {
				const current = this.mainReference?.sessionId;
				if (current === void 0 || !this.workspaces.list.getSnapshot().archivedSessionIds.includes(current)) return false;
				this.clearMain();
				return true;
			}
			clearMain() {
				const previous = this.mainReference;
				this.mainReference = void 0;
				this.selection.set({});
				previous?.release();
				this.ctx.layout.selectPanel(null);
			}
			replaceMain(target, signal, panel, beforeOpen) {
				signal.throwIfAborted();
				const reference = this.sessions.retain(target, { source: "mainView" });
				try {
					signal.throwIfAborted();
					beforeOpen?.(reference.sessionId);
					if (signal.aborted) {
						reference.release();
						return;
					}
					const subagentAddress = typeof target === "string" ? this.sessions.subagentAddress(reference.sessionId) : target;
					this.selection.set({
						sessionId: reference.sessionId,
						...subagentAddress === void 0 ? {} : { subagentAddress }
					});
				} catch (error) {
					reference.release();
					throw error;
				}
				const previous = this.mainReference;
				this.mainReference = reference;
				previous?.release();
				if (panel === "reveal") this.ctx.layout.selectPanel(null);
			}
		};
		/**
		* `error` as the Session Controller's creation failure, or undefined when it
		* is not one. Client plugin bundles do not share error-class identity, so the
		* name decides.
		*/
		function sessionCreateErrorOf(error) {
			return error instanceof Error && error.name === "SessionCreateError" ? error : void 0;
		}
		/**
		* The words a failed Session creation is reported in: a Host refusal keeps its
		* stable code and message; any other failure keeps its own message.
		*/
		function creationFailureMessage(error) {
			const refused = sessionCreateErrorOf(error);
			if (refused !== void 0) return `${refused.rpcError.code}: ${refused.rpcError.message}`;
			return error instanceof Error ? error.message : String(error);
		}
		/** Stable tie-breaking follows Host Workspace order. */
		function recentWorkspace(workspaces, sessions) {
			let selected;
			let selectedTime = Number.NEGATIVE_INFINITY;
			for (const workspace of workspaces) {
				let latest = Number.NEGATIVE_INFINITY;
				for (const sessionId of workspace.sessionIds) {
					const session = sessions[sessionId];
					if (session !== void 0) latest = Math.max(latest, session.updatedAt);
				}
				if (latest === Number.NEGATIVE_INFINITY) latest = Date.parse(workspace.createdAt);
				if (selected === void 0 || latest > selectedTime) {
					selected = workspace.workspaceId;
					selectedTime = latest;
				}
			}
			return selected;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
		function r(e) {
			var t, f, n = "";
			if ("string" == typeof e || "number" == typeof e) n += e;
			else if ("object" == typeof e) if (Array.isArray(e)) {
				var o = e.length;
				for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
			} else for (f in e) e[f] && (n && (n += " "), n += f);
			return n;
		}
		function clsx() {
			for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
			return n;
		}
		/**
		* The text one Workspace is labeled with. A Workspace still carrying the
		* automatic first-use title reads as the caller's localized default name; every
		* other title reads verbatim in every language. A title the user typed as
		* exactly {@link DEFAULT_WORKSPACE_DIRECTORY} is labeled as the default too;
		* nothing else depends on the distinction.
		* @param title - stored Workspace title.
		* @param localizedDefault - the default Workspace name in the active language.
		* @returns the title to display.
		*/
		function workspaceDisplayTitle(title, localizedDefault) {
			return title === "default-workspace" ? localizedDefault : title;
		}
		//#endregion
		//#region src/client/view-icons.tsx
		/** The card grid: four equal tiles, the gallery reading of the same rows. */
		function CardViewGlyph({ size = 16, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				className,
				viewBox: "0 0 16 16",
				fill: "none",
				xmlns: "http://www.w3.org/2000/svg",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "1.6",
						y: "1.6",
						width: "5.8",
						height: "5.8",
						rx: "1.6",
						fill: "currentColor"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "8.6",
						y: "1.6",
						width: "5.8",
						height: "5.8",
						rx: "1.6",
						fill: "currentColor"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "1.6",
						y: "8.6",
						width: "5.8",
						height: "5.8",
						rx: "1.6",
						fill: "currentColor"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
						x: "8.6",
						y: "8.6",
						width: "5.8",
						height: "5.8",
						rx: "1.6",
						fill: "currentColor"
					})
				]
			});
		}
		/**
		* A Session's type mark: an open speech bubble with a lower-left tail. Cards
		* carry it where rows carry their status slot, so both presentations name the
		* entity before its title.
		*/
		function SessionGlyph({ size = 16, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: size,
				height: size,
				className,
				viewBox: "0 0 16 16",
				fill: "none",
				xmlns: "http://www.w3.org/2000/svg",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M4.4 3H11.6A2.2 2.2 0 0 1 13.8 5.2V9.2A2.2 2.2 0 0 1 11.6 11.4H7.6L4.6 13.7V11.4H4.4A2.2 2.2 0 0 1 2.2 9.2V5.2A2.2 2.2 0 0 1 4.4 3Z",
					stroke: "currentColor",
					strokeWidth: "1.4",
					strokeLinejoin: "round"
				})
			});
		}
		/**
		* The theme control's tag: a label pointing right with its punch hole, drawn
		* at the card action cluster's scale. Its color is the caller's — a themed
		* card tints it with the theme's rainbow slot.
		*/
		function ThemeTagGlyph({ size = 16, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				className,
				viewBox: "0 0 16 16",
				fill: "none",
				xmlns: "http://www.w3.org/2000/svg",
				"aria-hidden": "true",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M2.8 4H10.6L14.2 8L10.6 12H2.8A1.2 1.2 0 0 1 1.6 10.8V5.2A1.2 1.2 0 0 1 2.8 4Z",
					stroke: "currentColor",
					strokeWidth: "1.4",
					strokeLinejoin: "round"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "5.2",
					cy: "8",
					r: "1.1",
					fill: "currentColor"
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:packages/client/ui-workspace/src/client/rows/Rows.module.css.mjs
		const css$4 = "._8AQUOq_projectRow,._8AQUOq_sessionRow{border-radius:var(--dsw-radius-md);padding:0 8px;cursor:pointer;user-select:none;color:var(--dsw-alias-label-primary);align-items:center;gap:6px;padding-inline-start:calc(8px + var(--dsh-workspace-indent,0px));display:flex}._8AQUOq_projectRow:hover,._8AQUOq_sessionRow:hover,._8AQUOq_sessionRow._8AQUOq_selected{background:var(--dsw-alias-interactive-bg-hover)}._8AQUOq_searchResultRow{box-sizing:border-box;border-radius:var(--dsw-radius-lg);cursor:pointer;text-align:left;width:100%;min-height:48px;color:var(--dsw-alias-label-primary);background:0 0;border:none;flex-direction:column;align-items:stretch;padding:4px 8px;display:flex}._8AQUOq_searchResultRow:hover,._8AQUOq_searchResultRow._8AQUOq_selected{background:var(--dsw-alias-interactive-bg-hover)}._8AQUOq_searchResultHeading{align-items:center;min-width:0;display:flex}._8AQUOq_searchResultTitle{text-overflow:ellipsis;white-space:nowrap;flex:0 auto;min-width:0;margin-left:4px;font-size:14px;line-height:20px;overflow:hidden}._8AQUOq_searchResultMeta{align-items:center;gap:6px;min-width:0;margin-left:20px;display:flex}._8AQUOq_searchResultWorkspace,._8AQUOq_searchResultSnippet{text-overflow:ellipsis;white-space:nowrap;font-size:12px;line-height:17px;overflow:hidden}._8AQUOq_searchResultWorkspace{max-width:40%;color:var(--dsw-alias-label-tertiary);flex:none}._8AQUOq_searchResultWorkspace:only-child{max-width:100%}._8AQUOq_searchResultSnippet{min-width:0;color:var(--dsw-alias-label-secondary);flex:1}._8AQUOq_projectRow{box-sizing:border-box;align-items:center;height:34px}._8AQUOq_projectRow ._8AQUOq_rowActions{height:20px}._8AQUOq_sessionRow{gap:0;height:32px}._8AQUOq_sessionRow ._8AQUOq_title{margin:0 6px 0 4px}._8AQUOq_slot{width:16px;height:20px;color:var(--dsw-alias-label-tertiary);flex:none;justify-content:center;align-items:center;display:inline-flex}._8AQUOq_visuallyHidden{clip:rect(0 0 0 0);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}._8AQUOq_folderActive{color:var(--dsw-alias-state-business-primary)}._8AQUOq_projectRow ._8AQUOq_chevron{display:none}._8AQUOq_projectRow:hover ._8AQUOq_chevron{display:inline-flex}._8AQUOq_projectRow:hover ._8AQUOq_folder{display:none}._8AQUOq_arrow{transition:transform .15s var(--ds-ease-in-out)}._8AQUOq_arrowOpen{transform:rotate(90deg)}._8AQUOq_projectText{flex:1;align-items:center;gap:6px;min-width:0;display:flex}._8AQUOq_folderPin{color:var(--dsw-alias-label-caption);flex:none;align-items:center;display:inline-flex}._8AQUOq_title{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:14px;line-height:20px;overflow:hidden}._8AQUOq_renameInput{border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-sm);background:var(--dsw-alias-button-elevated-fill);min-width:0;color:inherit;outline:none;padding:0 2px;font-size:14px;line-height:20px}._8AQUOq_sessionRow ._8AQUOq_title{flex:1}._8AQUOq_sessionRow ._8AQUOq_title[data-scrolled]{mask-image:linear-gradient(90deg,#0000,#000 12px)}._8AQUOq_sessionRow ._8AQUOq_title[data-clipped]{mask-image:linear-gradient(270deg,#0000,#000 12px)}._8AQUOq_sessionRow ._8AQUOq_title[data-scrolled][data-clipped]{mask-image:linear-gradient(90deg,#0000,#000 12px calc(100% - 12px),#0000)}._8AQUOq_meta{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:20px;overflow:hidden}._8AQUOq_time{color:var(--dsw-alias-label-tertiary);flex:none;font-size:10px;line-height:16px}._8AQUOq_pinIndicator{width:16px;height:20px;color:var(--dsw-alias-label-caption);flex:none;justify-content:center;align-items:center;margin-left:6px;display:inline-flex}._8AQUOq_sessionRow._8AQUOq_archived ._8AQUOq_title,._8AQUOq_searchResultRow._8AQUOq_archived ._8AQUOq_searchResultTitle,._8AQUOq_searchResultRow._8AQUOq_archived ._8AQUOq_searchResultWorkspace,._8AQUOq_searchResultRow._8AQUOq_archived ._8AQUOq_searchResultSnippet{color:var(--dsw-alias-label-caption)}._8AQUOq_dot{flex:none}._8AQUOq_rowActions{flex:none;align-items:center;gap:10px;display:none}._8AQUOq_projectRow:hover ._8AQUOq_rowActions,._8AQUOq_sessionRow:hover ._8AQUOq_rowActions,._8AQUOq_searchResultRow:hover ._8AQUOq_rowActions,._8AQUOq_projectRow._8AQUOq_menuOpen ._8AQUOq_rowActions,._8AQUOq_sessionRow._8AQUOq_menuOpen ._8AQUOq_rowActions{display:inline-flex}._8AQUOq_searchResultHeading ._8AQUOq_rowActions{margin-left:auto}._8AQUOq_sessionRow:hover ._8AQUOq_time,._8AQUOq_sessionRow._8AQUOq_menuOpen ._8AQUOq_time,._8AQUOq_sessionRow:hover ._8AQUOq_pinIndicator,._8AQUOq_sessionRow._8AQUOq_menuOpen ._8AQUOq_pinIndicator{display:none}@media (hover:hover){._8AQUOq_sessionRow:hover ._8AQUOq_title,._8AQUOq_sessionRow._8AQUOq_menuOpen ._8AQUOq_title{text-overflow:clip}}._8AQUOq_projectRow._8AQUOq_menuOpen,._8AQUOq_sessionRow._8AQUOq_menuOpen{background:var(--dsw-alias-interactive-bg-hover)}._8AQUOq_sessionRow._8AQUOq_dropBefore,._8AQUOq_sessionRow._8AQUOq_dropAfter{position:relative}._8AQUOq_sessionRow._8AQUOq_dropBefore:before,._8AQUOq_sessionRow._8AQUOq_dropAfter:after{content:\"\";z-index:1;background:linear-gradient(55deg, transparent calc(50% - 1px), var(--dsw-alias-state-business-primary) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)) 0 0 / 5px 7px no-repeat, linear-gradient(125deg, transparent calc(50% - 1px), var(--dsw-alias-state-business-primary) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)) 0 5px / 5px 7px no-repeat, linear-gradient(var(--dsw-alias-state-business-primary) 0 0) 4px 5px / calc(100% - 4px) 2px no-repeat;pointer-events:none;height:12px;position:absolute;left:0;right:4px}._8AQUOq_sessionRow._8AQUOq_dropBefore:before{top:-7px}._8AQUOq_sessionRow._8AQUOq_dropAfter:after{bottom:-7px}._8AQUOq_hoverContent{flex-direction:column;gap:8px;display:flex}._8AQUOq_hoverTitle{color:#fff;overflow-wrap:break-word;font-size:14px;line-height:20px}._8AQUOq_hoverPath{color:#cfd3d6;word-break:break-all;font-size:12px;line-height:16px}._8AQUOq_hoverTime{color:#cfd3d6;font-size:12px;line-height:16px}._8AQUOq_hoverStatus{color:#adb2b8;align-items:center;gap:8px;font-size:12px;line-height:20px;display:flex}._8AQUOq_hoverArchived svg{flex-shrink:0;margin:0 -4px}._8AQUOq_iconButton{border-radius:var(--dsw-radius-xs);cursor:pointer;width:16px;height:16px;color:var(--dsw-alias-label-tertiary);background:0 0;border:none;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}._8AQUOq_iconButton:hover{color:var(--dsw-alias-label-primary)}._8AQUOq_chevron{color:var(--dsw-alias-label-caption)}@media (prefers-reduced-motion:reduce){._8AQUOq_arrow{transition:none;animation:none}}._8AQUOq_colorSwatch{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l4);border-radius:4px;width:14px;height:14px}";
		const tagId$4 = "@deepseek-ai/dsh-client-ui-workspace/Rows.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$4) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-workspace";
			tag.dataset.pluginCss = tagId$4;
			tag.textContent = css$4;
			document.head.appendChild(tag);
		}
		var Rows_module_css_default = {
			"archived": "_8AQUOq_archived",
			"arrow": "_8AQUOq_arrow",
			"arrowOpen": "_8AQUOq_arrowOpen",
			"chevron": "_8AQUOq_chevron",
			"colorSwatch": "_8AQUOq_colorSwatch",
			"dot": "_8AQUOq_dot",
			"dropAfter": "_8AQUOq_dropAfter",
			"dropBefore": "_8AQUOq_dropBefore",
			"folder": "_8AQUOq_folder",
			"folderActive": "_8AQUOq_folderActive",
			"folderPin": "_8AQUOq_folderPin",
			"hoverArchived": "_8AQUOq_hoverArchived",
			"hoverContent": "_8AQUOq_hoverContent",
			"hoverPath": "_8AQUOq_hoverPath",
			"hoverStatus": "_8AQUOq_hoverStatus",
			"hoverTime": "_8AQUOq_hoverTime",
			"hoverTitle": "_8AQUOq_hoverTitle",
			"iconButton": "_8AQUOq_iconButton",
			"menuOpen": "_8AQUOq_menuOpen",
			"meta": "_8AQUOq_meta",
			"pinIndicator": "_8AQUOq_pinIndicator",
			"projectRow": "_8AQUOq_projectRow",
			"projectText": "_8AQUOq_projectText",
			"renameInput": "_8AQUOq_renameInput",
			"rowActions": "_8AQUOq_rowActions",
			"searchResultHeading": "_8AQUOq_searchResultHeading",
			"searchResultMeta": "_8AQUOq_searchResultMeta",
			"searchResultRow": "_8AQUOq_searchResultRow",
			"searchResultSnippet": "_8AQUOq_searchResultSnippet",
			"searchResultTitle": "_8AQUOq_searchResultTitle",
			"searchResultWorkspace": "_8AQUOq_searchResultWorkspace",
			"selected": "_8AQUOq_selected",
			"sessionRow": "_8AQUOq_sessionRow",
			"slot": "_8AQUOq_slot",
			"time": "_8AQUOq_time",
			"title": "_8AQUOq_title",
			"visuallyHidden": "_8AQUOq_visuallyHidden"
		};
		//#endregion
		//#region src/client/rows/Rows.tsx
		/**
		* Workspace browser tree row components (figma Cell set 14:3080): pure presentational —
		* all data and callbacks arrive via props. Hover swaps (folder->chevron,
		* time->ellipsis, action buttons) are CSS-only, and a session row's clipped
		* title marquees programmatically while the row is hovered. Workspace row
		* menus are visual-only except Rename/Delete. A Session row's "..." menu and
		* its hover buttons are the `sidebar.workspaces.session.menu.item` and
		* `sidebar.workspaces.session.row.action` lists, rendered through the
		* browser's `renderSlot` with the menu's open state as the occurrence's hook
		* context; this package's own actions are entries like any plugin's. The
		* session and workspace hover cards are suppressed while a menu is open.
		*/
		/**
		* Row display title: blank rows show the localized New Session label.
		* @param node - derived Session node.
		* @param t - the browser root's locale seat.
		* @returns the title the row or card shows.
		*/
		function displayTitle(node, t) {
			return node.blank ? t("session.new") : node.title || t("session.untitled");
		}
		const MIN_TITLE_REVEAL_PX = 8;
		const TITLE_MARQUEE_PX_PER_MS = .03;
		/**
		* Place the title's scroll position and publish the stylesheet's fade-mask
		* hooks: `data-scrolled` while the title has left its start (left fade) and
		* `data-clipped` while text remains beyond the right edge (right fade).
		* @param title - the row's clipping title element.
		* @param left - scroll offset in CSS pixels.
		* @param range - the title's maximum scroll offset in CSS pixels.
		*/
		function placeTitle(title, left, range) {
			if (typeof title.scrollTo === "function") title.scrollTo({
				left,
				behavior: "instant"
			});
			else title.scrollLeft = left;
			if (left > 0) title.dataset.scrolled = "";
			else delete title.dataset.scrolled;
			if (left < range) title.dataset.clipped = "";
			else delete title.dataset.clipped;
		}
		/**
		* Return the title to its resting state: scrolled to the start with both fade
		* masks off, so the resting ellipsis renders at full strength.
		* @param title - the row's clipping title element.
		*/
		function restTitle(title) {
			if (typeof title.scrollTo === "function") title.scrollTo({
				left: 0,
				behavior: "instant"
			});
			else title.scrollLeft = 0;
			delete title.dataset.scrolled;
			delete title.dataset.clipped;
		}
		/**
		* Marquee a title wider than its one-line cell while its row is hovered: the
		* title clips its own text, so entering crawls it at a constant speed until the
		* far edge (a fork's incremented title, for example) is in view, then rests
		* there under the pointer. Overflow of at most {@link MIN_TITLE_REVEAL_PX}
		* stays put — a barely-clipped title moving a few pixels reads as jitter, not a
		* reveal. Leaving returns the title to the start in one step, because the
		* resting ellipsis and the narrowed cell would otherwise meet the text while it
		* travelled back. Reduced motion jumps to the far edge instead of crawling.
		* @param title - ref to the row's clipping title element.
		* @returns stable pointer enter/leave handlers for the row.
		*/
		function useTitleMarquee(title) {
			const frame = (0, react.useRef)(0);
			(0, react.useEffect)(() => () => {
				cancelAnimationFrame(frame.current);
			}, []);
			return (0, react.useMemo)(() => ({
				enter: () => {
					/* v8 ignore next -- defensive: the title span renders unconditionally. */
					if (title.current === null) return;
					const element = title.current;
					const range = element.scrollWidth - element.clientWidth;
					if (range <= MIN_TITLE_REVEAL_PX) return;
					if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
						placeTitle(element, range, range);
						return;
					}
					cancelAnimationFrame(frame.current);
					let previous;
					let position = 0;
					const step = (now) => {
						position += previous === void 0 ? 0 : (now - previous) * TITLE_MARQUEE_PX_PER_MS;
						previous = now;
						placeTitle(element, Math.min(position, range), range);
						if (position < range) frame.current = requestAnimationFrame(step);
					};
					frame.current = requestAnimationFrame(step);
				},
				leave: () => {
					cancelAnimationFrame(frame.current);
					/* v8 ignore next -- defensive: the title span renders unconditionally. */
					if (title.current === null) return;
					restTitle(title.current);
				}
			}), [title]);
		}
		/**
		* Localized compact relative time ("刚刚"/"5分钟" in zh, "now"/"5min" in en).
		* @param updatedAt - epoch ms of the Session's last update.
		* @param now - epoch ms for the distance.
		* @param t - the browser root's locale seat.
		* @returns the compact label.
		*/
		function timeLabel(updatedAt, now, t) {
			const { unit, n } = (0, _deepseek_ai_dsh_client_ui_primitives.relativeTime)(updatedAt, now);
			return unit === "now" ? t("time.now") : t(`time.${unit}`, { n });
		}
		/** Hover-card variant: distances wrap in the ago template; the now bucket stays bare (no "now ago"). */
		function hoverTimeLabel(updatedAt, now, t) {
			const { unit, n } = (0, _deepseek_ai_dsh_client_ui_primitives.relativeTime)(updatedAt, now);
			return unit === "now" ? t("time.now") : t("time.ago", { t: t(`time.${unit}`, { n }) });
		}
		/**
		* Absolute creation time through the dictionary's date template (the message
		* clock pattern): `toLocaleString` would follow the browser language, not the
		* app locale, and produce mixed-language text after a switch.
		*/
		function createdLabel(createdAt, t) {
			const d = new Date(createdAt);
			const pad2 = (v) => String(v).padStart(2, "0");
			return t("hover.created", { time: `${t("date.ymd", {
				y: d.getFullYear(),
				m: d.getMonth() + 1,
				d: d.getDate()
			})} ${pad2(d.getHours())}:${pad2(d.getMinutes())}` });
		}
		/** Hover-card body: workspace title, display directory path, absolute creation time. */
		function WorkspaceHoverContent({ label, cwd, createdAt, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Rows_module_css_default.hoverContent,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Rows_module_css_default.hoverTitle,
						children: label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Rows_module_css_default.hoverPath,
						children: cwd
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Rows_module_css_default.hoverTime,
						children: createdLabel(createdAt, t)
					})
				]
			});
		}
		/** Pointer-position half of a row (insert line above or below). */
		function rowHalf(e) {
			const rect = e.currentTarget.getBoundingClientRect();
			return e.clientY < rect.top + rect.height / 2 ? "before" : "after";
		}
		/**
		* Folder color choices offered by the Workspace menu. Values are the exact
		* swatches the 0.1 build shipped; `default` clears the tint.
		*/
		const WORKSPACE_COLORS = [
			{
				id: "red",
				value: "#ef5350"
			},
			{
				id: "orange",
				value: "#fb8c00"
			},
			{
				id: "yellow",
				value: "#fbc02d"
			},
			{
				id: "green",
				value: "#66bb6a"
			},
			{
				id: "cyan",
				value: "#26c6da"
			},
			{
				id: "blue",
				value: "#42a5f5"
			},
			{
				id: "purple",
				value: "#ab47bc"
			},
			{
				id: "pink",
				value: "#ec407a"
			}
		];
		/**
		* Project (workspace) header row: folder + title;
		* hover reveals the chevron and create button, and dwelling on a real
		* Workspace shows its hover card (the ungrouped bucket has none).
		* `containsCurrent` arrives on the node (derivation fact, no renderer scan).
		* @param props.group - derived group node.
		* @param props.containsCurrentDescendant - highlight an ancestor even when its subtree is collapsed.
		* @param props.onToggle - expand/collapse the group.
		* @param props.onCreate - start a frontend Session inside this Workspace.
		* @param props.drag - optional workspace-row drag wiring.
		* @param props.home - host account home for POSIX hover-path abbreviation.
		* @param props.t - the browser root's locale seat.
		* @returns the row element.
		*/
		function ProjectRowItem({ group, containsCurrentDescendant = false, onToggle, onCreate, actions, color, pinned, drag, home, newShortcut, t }) {
			const row = group;
			const label = row.workspaceId === void 0 ? t("group.ungrouped") : row.label;
			const active = containsCurrentDescendant || group.expanded && group.containsCurrent;
			const [menuOpen, setMenuOpen] = (0, react.useState)(false);
			const colorMenu = [{
				id: "color:default",
				label: t("color.default"),
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: Rows_module_css_default.colorSwatch,
					"aria-hidden": "true"
				})
			}, ...WORKSPACE_COLORS.map((choice) => ({
				id: `color:${choice.value}`,
				label: t(`color.${choice.id}`),
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: Rows_module_css_default.colorSwatch,
					style: { background: choice.value },
					"aria-hidden": "true"
				})
			}))];
			const workspaceMenuItems = [
				...actions?.togglePin === void 0 ? [] : [{
					id: "pin",
					label: pinned === true ? t("menu.unpin") : t("menu.pin"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPinFillRegular, {})
				}],
				...actions?.setColor === void 0 ? [] : [{
					id: "color",
					label: t("menu.color"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderCloseRegular, {}),
					submenu: colorMenu
				}],
				...actions?.togglePin === void 0 && actions?.setColor === void 0 ? [] : [{
					type: "separator",
					id: "workspace-display-separator"
				}],
				{
					id: "rename",
					label: t("rename"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular, {})
				},
				{
					id: "delete",
					label: t("delete.workspace"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, {}),
					danger: true
				}
			];
			const ownRow = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(Rows_module_css_default.projectRow, menuOpen && Rows_module_css_default.menuOpen),
				"data-row-key": `workspace:${group.key}`,
				role: "treeitem",
				"aria-expanded": row.expanded,
				onClick: onToggle,
				draggable: drag !== void 0,
				onDragStart: drag === void 0 ? void 0 : (e) => {
					e.dataTransfer.effectAllowed = "move";
					e.dataTransfer.setData("text/plain", row.key);
					drag.start();
				},
				onDragEnd: drag?.end,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: clsx(Rows_module_css_default.slot, Rows_module_css_default.folder, active && Rows_module_css_default.folderActive),
						style: color === void 0 ? void 0 : { color },
						children: row.expanded ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpenRegular, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderCloseRegular, {})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: clsx(Rows_module_css_default.slot, Rows_module_css_default.chevron),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTriangleRightFillRegular, { className: clsx(Rows_module_css_default.arrow, row.expanded && Rows_module_css_default.arrowOpen) })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: Rows_module_css_default.projectText,
						children: [pinned === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Rows_module_css_default.folderPin,
							title: t("menu.pin"),
							role: "img",
							"aria-label": t("menu.pin"),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPinFillRegular, { size: 14 })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Rows_module_css_default.title,
							children: label
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: Rows_module_css_default.rowActions,
						children: [actions !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
							open: menuOpen,
							onClose: () => {
								setMenuOpen(false);
							},
							items: workspaceMenuItems,
							onSelect: (id) => {
								setMenuOpen(false);
								if (id === "pin") {
									actions.togglePin?.();
									return;
								}
								if (id.startsWith("color:")) {
									actions.setColor?.(id === "color:default" ? void 0 : id.slice(6));
									return;
								}
								/* v8 ignore next -- Menu can emit only the rows supplied above. */
								if (id !== "rename" && id !== "delete") return;
								if (id === "rename") actions.rename();
								else actions.delete();
							},
							portal: true,
							closeOnPointerLeave: true,
							anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: Rows_module_css_default.iconButton,
								"aria-label": t("actions.workspace.aria", { name: label }),
								onClick: (e) => {
									e.stopPropagation();
									setMenuOpen((v) => !v);
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutlineRegular, {})
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
							label: t("actions.newSession"),
							shortcutKeys: newShortcut?.keys,
							side: "bottom",
							align: "end",
							delayMs: 500,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: Rows_module_css_default.iconButton,
								"aria-keyshortcuts": newShortcut?.aria,
								"aria-label": t("actions.newSession.aria", { name: label }),
								onClick: (e) => {
									e.stopPropagation();
									onCreate();
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconNewChatOutlineRegular, {})
							})
						})]
					})
				]
			});
			if (row.createdAt === void 0) return ownRow;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.HoverCard, {
				anchor: ownRow,
				content: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkspaceHoverContent, {
					label: row.label,
					cwd: row.cwd === void 0 ? void 0 : abbreviateHomePath(row.cwd, home),
					createdAt: row.createdAt,
					t
				}),
				openDelayMs: 800,
				disabled: menuOpen,
				copyText: row.cwd,
				copyLabel: t("copy"),
				copiedLabel: t("hover.copied")
			});
		}
		/* v8 ignore next 3 -- closed-union backstop; only reached if the status is forged */
		function assertNever(value) {
			throw new Error(`unknown pending interaction: ${String(value)}`);
		}
		/**
		* Session status presentation; pending interaction is primary and live activity
		* outranks completion reminders.
		* @param node - the row's live status facts.
		* @param t - the browser root's locale seat.
		* @returns the primary status first, then any companion status.
		*/
		function sessionStatuses(node, t) {
			const subagents = node.runningSubagentCount === 0 ? void 0 : {
				state: "ongoing",
				label: t(node.runningSubagentCount === 1 ? "status.subagentsRunning.one" : "status.subagentsRunning.other", { n: node.runningSubagentCount })
			};
			let pending;
			switch (node.pendingInteraction) {
				case "approval":
					pending = {
						state: "warning",
						label: t("status.waitingApproval"),
						trailingLabel: t("status.compact.approval")
					};
					break;
				case "plan-review":
					pending = {
						state: "warning",
						label: t("status.planReview"),
						trailingLabel: t("status.compact.planReview")
					};
					break;
				case "question":
					pending = {
						state: "warning",
						label: t("status.waitingAnswer"),
						trailingLabel: t("status.compact.answer")
					};
					break;
				case void 0: break;
				/* v8 ignore next -- closed PendingInteractionStatus union */
				default: return assertNever(node.pendingInteraction);
			}
			if (pending !== void 0) return subagents === void 0 ? [pending] : [pending, subagents];
			if (node.running) {
				const primary = {
					state: "ongoing",
					label: t("status.running")
				};
				return subagents === void 0 ? [primary] : [primary, subagents];
			}
			if (subagents !== void 0) return [subagents];
			if (node.completed) return [{
				state: "done",
				label: t("status.completed")
			}];
			return [{
				state: "idle",
				label: t("status.idle")
			}];
		}
		/**
		* Primary status dot plus every status's screen-reader label, shared by the
		* search, session, and card presentations.
		* @param props.statuses - the Session's statuses, primary first.
		* @returns the dot with its hidden labels.
		*/
		function SessionStatusDots({ statuses }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: statuses[0].state }), statuses.map((status) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: Rows_module_css_default.visuallyHidden,
				children: status.label
			}, status.label))] });
		}
		/** Non-interactive pinned-row marker; the enclosing row remains the only action. */
		function PinnedIndicator({ t }) {
			const label = t("row.pinned");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: Rows_module_css_default.pinIndicator,
				role: "img",
				"aria-label": label,
				title: label,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPinFillRegular, { size: 14 })
			});
		}
		/**
		* Hover-card body: full title, relative time, the Session's own scheduled-task
		* section, and every relevant live status. The task section sits above the
		* status lines so they stay the card's trailing status line. Shared by the row
		* and card presentations, so both hover cards read the same seats.
		* @param props.node - derived Session node.
		* @param props.now - epoch ms for relative-time formatting.
		* @param props.renderSlot - child-seat renderer for the hover-card section.
		* @param props.t - the browser root's locale seat.
		* @returns the hover-card content.
		*/
		function SessionHoverContent({ node, now, renderSlot, t }) {
			const statuses = sessionStatuses(node, t).filter((status) => !(node.archived && (status.state === "done" || status.state === "idle")));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Rows_module_css_default.hoverContent,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Rows_module_css_default.hoverTitle,
						children: displayTitle(node, t)
					}),
					!node.blank && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: Rows_module_css_default.hoverTime,
						children: hoverTimeLabel(node.updatedAt, now, t)
					}),
					renderSlot("sidebar.session.row.hover", { sessionId: node.id }),
					statuses.map((status) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: Rows_module_css_default.hoverStatus,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: status.state }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: status.label })]
					}, status.label)),
					node.archived && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: clsx(Rows_module_css_default.hoverStatus, Rows_module_css_default.hoverArchived),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconArchiveOutlineRegular, { size: 14 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("row.archived") })]
					})
				]
			});
		}
		/**
		* One flat search result: title, Workspace context, and optional content
		* excerpt. Search navigation opens the session only; it does not address an
		* event inside the conversation. Archived rows carry a hover unarchive
		* button, because search is where the filter surfaces them for recovery.
		* @param props.result - merged local/content search row.
		* @param props.currentId - selected session id.
		* @param props.onOpen - open the selected session.
		* @param props.onUnarchive - unarchive an archived result row.
		* @param props.t - Workspace-browser translation seat.
		* @returns the result row.
		*/
		function SearchResultItem({ result, currentId, onOpen, onUnarchive, t }) {
			const selected = result.id === currentId;
			const statuses = sessionStatuses(result, t);
			const primaryStatus = statuses[0];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(Rows_module_css_default.searchResultRow, selected && Rows_module_css_default.selected, result.archived && Rows_module_css_default.archived),
				role: "treeitem",
				"aria-selected": selected,
				"aria-description": result.archived ? t("toast.archivedNotOpenable") : void 0,
				onClick: () => {
					onOpen(result.id);
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: Rows_module_css_default.searchResultHeading,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Rows_module_css_default.slot,
							children: !result.archived && primaryStatus.state !== "idle" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionStatusDots, { statuses })
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Rows_module_css_default.searchResultTitle,
							children: result.title || t("session.untitled")
						}),
						result.archived && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Rows_module_css_default.rowActions,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
								label: t("actions.unarchive"),
								side: "bottom",
								align: "end",
								delayMs: 500,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: Rows_module_css_default.iconButton,
									"aria-label": t("menu.unarchiveSession"),
									onClick: (e) => {
										e.stopPropagation();
										onUnarchive(result.id);
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconUnarchiveOutlineRegular, { size: 14 })
								})
							})
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: Rows_module_css_default.searchResultMeta,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Rows_module_css_default.searchResultWorkspace,
						children: result.workspace || t("group.ungrouped")
					}), result.snippet !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Rows_module_css_default.searchResultSnippet,
						children: result.snippet
					})]
				})]
			});
		}
		/**
		* One top-level 32px session row: leading 16px cell (status dot, or the
		* leading seat while the row's primary state is idle), title, relative time or
		* compact pending label, and the row actions menu. A row that owns a state dot
		* keeps that cell and renders no seat, so an ambient automation mark never
		* appears beside the row's own state dot. An archived row keeps the cell blank:
		* neither marker renders there, and its live status stays on the hover card.
		* @param props.node - derived session node.
		* @param props.currentId - selected session id (row highlight).
		* @param props.now - epoch ms for relative-time formatting.
		* @param props.onOpen - open a session by id.
		* @param props.onRenameRequest - open the rename dialog from a title double-click (id + current title).
		* @param props.renderSlot - child-seat renderer for the row's action lists
		* (`sidebar.workspaces.session.menu.item` / `sidebar.workspaces.session.row.action`),
		* its leading decoration, and its hover-card section.
		* @param props.onReveal - scroll this row into view after search navigation, then acknowledge it.
		* @param props.drag - optional row-drag target wiring; blank rows cannot start a drag.
		* @param props.t - the browser root's locale seat.
		* @returns the session row.
		*/
		function SessionNodeItem({ node, currentId, now, onOpen, onRenameRequest, renderSlot, onReveal, drag, t }) {
			const row = node;
			const title = displayTitle(node, t);
			const selected = node.id === currentId;
			const statuses = sessionStatuses(node, t);
			const primaryStatus = statuses[0];
			const showStatus = primaryStatus.state !== "idle";
			const draggable = drag !== void 0 && !row.blank && !row.archived;
			const [menuOpen, setMenuOpen] = (0, react.useState)(false);
			const menuOpenState = (0, react.useMemo)(() => [menuOpen, setMenuOpen], [menuOpen]);
			const rowRef = (0, react.useRef)(null);
			const titleRef = (0, react.useRef)(null);
			const marquee = useTitleMarquee(titleRef);
			(0, react.useEffect)(() => {
				if (onReveal === void 0) return;
				rowRef.current?.scrollIntoView({ block: "nearest" });
				onReveal();
			}, [onReveal]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.HoverCard, {
				anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					ref: rowRef,
					"data-row-key": `session:${node.id}`,
					className: clsx(Rows_module_css_default.sessionRow, selected && Rows_module_css_default.selected, menuOpen && Rows_module_css_default.menuOpen, row.archived && Rows_module_css_default.archived, drag?.marker === "before" && Rows_module_css_default.dropBefore, drag?.marker === "after" && Rows_module_css_default.dropAfter),
					role: "treeitem",
					"aria-selected": selected,
					"aria-description": row.archived ? t("toast.archivedNotOpenable") : void 0,
					onClick: () => {
						onOpen(node.id);
					},
					onPointerEnter: marquee.enter,
					onPointerLeave: marquee.leave,
					draggable,
					onDragStart: !draggable ? void 0 : (e) => {
						e.dataTransfer.effectAllowed = "move";
						e.dataTransfer.setData("text/plain", node.id);
						drag.start();
					},
					onDragEnd: !draggable ? void 0 : drag.end,
					onDragOver: drag === void 0 ? void 0 : (e) => {
						if (!drag.active) return;
						e.preventDefault();
						e.dataTransfer.dropEffect = "move";
						drag.hover(rowHalf(e));
					},
					onDrop: drag === void 0 ? void 0 : (e) => {
						if (!drag.active) return;
						e.preventDefault();
						drag.drop(rowHalf(e));
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Rows_module_css_default.slot,
							children: !row.archived && !row.blank && (showStatus ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionStatusDots, { statuses }) : renderSlot("sidebar.session.row.leading", { sessionId: node.id }))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							ref: titleRef,
							className: Rows_module_css_default.title,
							onDoubleClick: row.blank ? void 0 : (e) => {
								e.stopPropagation();
								onRenameRequest(node.id, row.title);
							},
							children: title
						}),
						!row.blank && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: Rows_module_css_default.time,
							"aria-hidden": primaryStatus.trailingLabel === void 0 ? void 0 : true,
							children: primaryStatus.trailingLabel ?? timeLabel(row.updatedAt, now, t)
						}),
						row.pinned && !row.archived && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PinnedIndicator, { t }),
						!row.blank && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: Rows_module_css_default.rowActions,
							onClick: (e) => {
								e.stopPropagation();
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
								open: menuOpen,
								onClose: () => {
									setMenuOpen(false);
								},
								portal: true,
								closeOnPointerLeave: true,
								anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: Rows_module_css_default.iconButton,
									"aria-label": t("actions.session.aria", { name: title }),
									onClick: () => {
										setMenuOpen((v) => !v);
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutlineRegular, {})
								}),
								children: renderSlot("sidebar.workspaces.session.menu.item", {
									sessionId: node.id,
									displayTitle: row.title
								}, { hookContext: menuOpenState })
							}), renderSlot("sidebar.workspaces.session.row.action", {
								sessionId: node.id,
								displayTitle: row.title
							})]
						})
					]
				}),
				content: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionHoverContent, {
					node,
					now,
					renderSlot,
					t
				}),
				openDelayMs: 800,
				disabled: menuOpen || drag?.active === true,
				copyText: row.blank || row.title === "" ? void 0 : row.title,
				copyLabel: t("copy"),
				copiedLabel: t("hover.copied")
			});
		}
		//#endregion
		//#region \0dsh-css:packages/client/ui-workspace/src/client/rows/Cards.module.css.mjs
		const css$3 = ".JHfdSa_cardGroup{flex-direction:column;display:flex}.JHfdSa_cardGroup+.JHfdSa_cardGroup{margin-top:8px}.JHfdSa_folderCard{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:10px;overflow:hidden}.JHfdSa_cardGrid{grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:6px;margin-top:6px;display:grid}.JHfdSa_sessionCard{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:10px;height:100%;position:relative}.JHfdSa_sessionCard.JHfdSa_selected{border-color:var(--dsw-alias-state-business-primary)}.JHfdSa_cardBody{box-sizing:border-box;border-radius:inherit;cursor:pointer;text-align:left;width:100%;height:100%;font:inherit;color:var(--dsw-alias-label-primary);background:0 0;border:none;flex-direction:column;gap:6px;padding:8px;display:flex}.JHfdSa_cardBody:hover{background:var(--dsw-alias-interactive-bg-hover)}.JHfdSa_cardBody:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}.JHfdSa_cardHead{align-items:flex-start;gap:4px;min-width:0;display:flex}.JHfdSa_cardGlyph{height:18px;color:var(--dsw-alias-label-tertiary);flex:none;align-items:center;display:inline-flex}.JHfdSa_cardTitle{-webkit-line-clamp:2;overflow-wrap:anywhere;-webkit-box-orient:vertical;flex:1;min-width:0;font-size:12px;line-height:18px;display:-webkit-box;overflow:hidden}.JHfdSa_cardMeta{align-items:center;gap:4px;min-width:0;margin-top:auto;padding-right:40px;display:flex}.JHfdSa_cardStatus{flex:none;align-items:center;display:inline-flex}.JHfdSa_pinBadge{background:var(--dsw-alias-state-business-primary);border-radius:50%;flex:none;width:6px;height:6px}.JHfdSa_cardTime{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-tertiary);flex:1;font-size:11px;line-height:16px;overflow:hidden}.JHfdSa_cardActions{display:inline-flex;position:absolute;bottom:2px;right:2px}.JHfdSa_cardMenuButton,.JHfdSa_cardThemeButton{cursor:pointer;opacity:0;width:20px;height:20px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-radius:50%;justify-content:center;align-items:center;padding:0;display:inline-flex}.JHfdSa_sessionCard:hover .JHfdSa_cardMenuButton,.JHfdSa_sessionCard:hover .JHfdSa_cardThemeButton,.JHfdSa_sessionCard:focus-within .JHfdSa_cardMenuButton,.JHfdSa_sessionCard:focus-within .JHfdSa_cardThemeButton,.JHfdSa_sessionCard.JHfdSa_menuOpen .JHfdSa_cardMenuButton,.JHfdSa_sessionCard.JHfdSa_menuOpen .JHfdSa_cardThemeButton,.JHfdSa_cardThemeButton.JHfdSa_cardThemeAssigned{opacity:1}.JHfdSa_cardMenuButton:hover,.JHfdSa_cardThemeButton:hover{background:var(--dsw-alias-interactive-bg-hover)}.JHfdSa_cardMenuButton:focus-visible,.JHfdSa_cardThemeButton:focus-visible{opacity:1;outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}.JHfdSa_themeSwatch{box-sizing:border-box;border-radius:50%;width:14px;height:14px}.JHfdSa_themeSwatchNone{box-sizing:border-box;border:1px dashed var(--dsw-alias-label-tertiary);border-radius:50%;width:14px;height:14px}.JHfdSa_themeSections{flex-direction:column;margin-top:6px;display:flex}.JHfdSa_themeSection{border-radius:14px;padding:5px 7px 7px}.JHfdSa_themeSection+.JHfdSa_themeSection{margin-top:8px}.JHfdSa_themeSectionThemed{border:1.5px solid color-mix(in oklab, var(--theme-tint) 62%, transparent);background:linear-gradient(180deg, color-mix(in oklab, var(--theme-tint) 13%, transparent), color-mix(in oklab, var(--theme-tint) 5%, transparent));box-shadow:inset 0 1px 0 light-dark(#ffffffbf,#ffffff29), inset 0 -7px 12px -9px color-mix(in oklab, var(--theme-tint) 70%, transparent), 0 7px 16px -10px color-mix(in oklab, var(--theme-tint) 70%, transparent);transition:transform .24s cubic-bezier(.34,1.56,.64,1),box-shadow .24s ease-out}.JHfdSa_themeSectionThemed:hover{box-shadow:inset 0 1px 0 light-dark(#fffc,#fff3), inset 0 -8px 14px -9px color-mix(in oklab, var(--theme-tint) 78%, transparent), 0 11px 20px -10px color-mix(in oklab, var(--theme-tint) 78%, transparent);transform:translateY(-1px)scale(1.008)}@media (prefers-reduced-motion:reduce){.JHfdSa_themeSectionThemed{transition:none}.JHfdSa_themeSectionThemed:hover{transform:none}}.JHfdSa_themeSectionUnthemed{border-style:dashed;border-width:1px;border-color:var(--dsw-alias-border-l2)}.JHfdSa_themeHeader{align-items:center;gap:4px;min-width:0;height:20px;display:flex}.JHfdSa_themeDot{border-radius:50%;flex:none;width:8px;height:8px}.JHfdSa_themeDotUnthemed{border:1px dashed var(--dsw-alias-label-tertiary)}.JHfdSa_themeName{text-overflow:ellipsis;white-space:nowrap;max-width:60%;color:var(--dsw-alias-label-secondary);flex:none;font-size:11px;line-height:16px;overflow:hidden}.JHfdSa_themeCount{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-tertiary);flex:1;font-size:11px;line-height:16px;overflow:hidden}.JHfdSa_themeMenuButton{cursor:pointer;width:18px;height:18px;color:var(--dsw-alias-label-tertiary);background:0 0;border:none;border-radius:50%;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.JHfdSa_themeMenuButton:hover{background:var(--dsw-alias-interactive-bg-hover)}.JHfdSa_themeMenuButton:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}.JHfdSa_cardOverflowButton{cursor:pointer;text-align:left;height:28px;color:var(--dsw-alias-label-tertiary);background:0 0;border:none;border-radius:8px;margin-top:2px;padding:0 8px;font-size:12px}.JHfdSa_cardOverflowButton:hover{color:var(--dsw-alias-label-secondary)}";
		const tagId$3 = "@deepseek-ai/dsh-client-ui-workspace/Cards.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-workspace";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var Cards_module_css_default = {
			"cardActions": "JHfdSa_cardActions",
			"cardBody": "JHfdSa_cardBody",
			"cardGlyph": "JHfdSa_cardGlyph",
			"cardGrid": "JHfdSa_cardGrid",
			"cardGroup": "JHfdSa_cardGroup",
			"cardHead": "JHfdSa_cardHead",
			"cardMenuButton": "JHfdSa_cardMenuButton",
			"cardMeta": "JHfdSa_cardMeta",
			"cardOverflowButton": "JHfdSa_cardOverflowButton",
			"cardStatus": "JHfdSa_cardStatus",
			"cardThemeAssigned": "JHfdSa_cardThemeAssigned",
			"cardThemeButton": "JHfdSa_cardThemeButton",
			"cardTime": "JHfdSa_cardTime",
			"cardTitle": "JHfdSa_cardTitle",
			"folderCard": "JHfdSa_folderCard",
			"menuOpen": "JHfdSa_menuOpen",
			"pinBadge": "JHfdSa_pinBadge",
			"selected": "JHfdSa_selected",
			"sessionCard": "JHfdSa_sessionCard",
			"themeCount": "JHfdSa_themeCount",
			"themeDot": "JHfdSa_themeDot",
			"themeDotUnthemed": "JHfdSa_themeDotUnthemed",
			"themeHeader": "JHfdSa_themeHeader",
			"themeMenuButton": "JHfdSa_themeMenuButton",
			"themeName": "JHfdSa_themeName",
			"themeSection": "JHfdSa_themeSection",
			"themeSectionThemed": "JHfdSa_themeSectionThemed",
			"themeSectionUnthemed": "JHfdSa_themeSectionUnthemed",
			"themeSections": "JHfdSa_themeSections",
			"themeSwatch": "JHfdSa_themeSwatch",
			"themeSwatchNone": "JHfdSa_themeSwatchNone"
		};
		//#endregion
		//#region src/client/rows/Cards.tsx
		/**
		* Card-grid presentation of the browsing region: the same derived groups and
		* Session nodes the row tree draws, rendered as folder and Session cards. It
		* is a second body for the grouped tree rather than a second browser —
		* derivation, order accounts, expansion state, and the overflow fold stay in
		* the owner, so switching presentation re-renders one list instead of
		* re-reading anything.
		*
		* Cards keep the row verbs through the same seats the rows use: the "..." menu
		* renders the `sidebar.workspaces.session.menu.item` entries with the menu's
		* open state as hook context, the hover strip renders
		* `sidebar.workspaces.session.row.action`, and the hover card renders
		* `sidebar.session.row.hover`. A clipped title is exposed twice: the hover
		* card carries the full title with the Session's live statuses, and the
		* button's accessible name is the untruncated text. Cards carry no drag
		* wiring: an insert marker is a one-dimensional boundary, which a two-column
		* grid does not have.
		*
		* Each card also carries its theme control: a tag button opening the theme
		* panel of the Session's own project folder, where an existing theme can be
		* chosen, the Session can leave every theme, or a new theme can be named. A
		* folder whose account owns themes draws its cards in theme sections inside a
		* solid border tinted by the theme's rainbow slot, with the unthemed group
		* last inside a dashed neutral border; an account with no themes keeps the
		* plain grid, so nothing changes for a user who never defines one.
		*/
		/**
		* One Session card: type glyph and title on the first row, live status, pin
		* marker, and relative time on the last, with the theme tag and the row action
		* menu revealed on hover or keyboard focus. A blank New Session card is a
		* provisional placeholder, so like its row it carries no time label and no
		* verbs.
		* @param props.node - derived Session node.
		* @param props.seat - the shared per-card facts, seats, and verbs.
		* @returns the card element.
		*/
		function SessionCard({ node, seat }) {
			const { t, renderSlot } = seat;
			const title = displayTitle(node, t);
			const selected = node.id === seat.currentId;
			const statuses = sessionStatuses(node, t);
			const showStatus = statuses[0].state !== "idle";
			const [menuOpen, setMenuOpen] = (0, react.useState)(false);
			const [themeOpen, setThemeOpen] = (0, react.useState)(false);
			const menuOpenState = (0, react.useMemo)(() => [menuOpen, setMenuOpen], [menuOpen]);
			const themeSeat = seat.theme;
			const themes = themeSeat === void 0 ? [] : themeSeat.themesOf(node.id);
			const assignedId = themeSeat?.assigned[node.id];
			const assignedTheme = themes.find((theme) => theme.id === assignedId);
			const themeItems = [
				{
					type: "label",
					id: "theme-label",
					text: t("theme.menu.label")
				},
				{
					id: THEME_NONE_ENTRY,
					label: t("theme.none"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Cards_module_css_default.themeSwatchNone,
						"aria-hidden": "true"
					})
				},
				...themes.map((theme) => ({
					id: `${THEME_ENTRY_PREFIX}${theme.id}`,
					label: theme.name,
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Cards_module_css_default.themeSwatch,
						style: { background: themeColor(theme.colorSlot) },
						"aria-hidden": "true"
					})
				})),
				{
					type: "separator",
					id: "theme-separator"
				},
				{
					id: THEME_NEW_ENTRY,
					label: t("theme.create"),
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, {})
				}
			];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.HoverCard, {
				anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: clsx(Cards_module_css_default.sessionCard, selected && Cards_module_css_default.selected, (menuOpen || themeOpen) && Cards_module_css_default.menuOpen),
					role: "listitem",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: Cards_module_css_default.cardBody,
						"aria-current": selected ? "true" : void 0,
						onClick: () => {
							seat.onOpen(node.id);
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: Cards_module_css_default.cardHead,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Cards_module_css_default.cardGlyph,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionGlyph, { size: 14 })
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: Cards_module_css_default.cardTitle,
								children: title
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: Cards_module_css_default.cardMeta,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: Cards_module_css_default.cardStatus,
									children: showStatus && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionStatusDots, { statuses })
								}),
								node.pinned && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: Cards_module_css_default.pinBadge,
									title: t("row.pinned"),
									"aria-hidden": "true"
								}),
								!node.blank && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: Cards_module_css_default.cardTime,
									children: timeLabel(node.updatedAt, seat.now, t)
								})
							]
						})]
					}), !node.blank && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: Cards_module_css_default.cardActions,
						children: [
							themeSeat !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
								open: themeOpen,
								onClose: () => {
									setThemeOpen(false);
								},
								items: themeItems,
								selectedIds: [assignedId === void 0 ? "theme.none" : `theme:${assignedId}`],
								onSelect: (id) => {
									setThemeOpen(false);
									if (id === "theme.none") themeSeat.assign(node.id, void 0);
									else if (id === "theme.new") themeSeat.create(themeSeat.accountOf(node.id));
									else themeSeat.assign(node.id, id.slice(6));
								},
								align: "start",
								portal: true,
								closeOnPointerLeave: true,
								anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: clsx(Cards_module_css_default.cardThemeButton, assignedTheme !== void 0 && Cards_module_css_default.cardThemeAssigned),
									style: assignedTheme === void 0 ? void 0 : { color: themeColor(assignedTheme.colorSlot) },
									title: assignedTheme?.name ?? t("theme.menu.label"),
									"aria-label": t("theme.card.aria", { name: title }),
									"aria-haspopup": "menu",
									"aria-expanded": themeOpen,
									onClick: () => {
										setThemeOpen((v) => !v);
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThemeTagGlyph, { size: 12 })
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
								open: menuOpen,
								onClose: () => {
									setMenuOpen(false);
								},
								portal: true,
								closeOnPointerLeave: true,
								anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: Cards_module_css_default.cardMenuButton,
									"aria-label": t("actions.session.aria", { name: title }),
									onClick: () => {
										setMenuOpen((v) => !v);
									},
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutlineRegular, {})
								}),
								children: renderSlot("sidebar.workspaces.session.menu.item", {
									sessionId: node.id,
									displayTitle: node.title
								}, { hookContext: menuOpenState })
							}),
							renderSlot("sidebar.workspaces.session.row.action", {
								sessionId: node.id,
								displayTitle: node.title
							})
						]
					})]
				}),
				content: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionHoverContent, {
					node,
					now: seat.now,
					renderSlot,
					t
				}),
				disabled: menuOpen || themeOpen,
				copyText: node.blank ? void 0 : node.title,
				copyLabel: t("copy"),
				copiedLabel: t("hover.copied")
			});
		}
		/**
		* One card grid in its own scrolling-host slot: a Workspace group of the
		* grouped body renders through here, so the column rhythm and the list
		* semantics are defined once.
		* @param props.nodes - Session nodes in render order.
		* @param props.seat - the shared per-card facts and verbs.
		* @param props.label - accessible name of this grid.
		* @returns the grid element.
		*/
		function CardGrid({ nodes, seat, label }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: Cards_module_css_default.cardGrid,
				role: "list",
				"aria-label": label,
				children: nodes.map((node) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionCard, {
					node,
					seat
				}, node.id))
			});
		}
		/**
		* One theme section header: the theme's color, name, and member count, plus
		* the rename/delete menu. The unthemed group draws the same header without a
		* menu, so both sections name themselves where their grid begins.
		* @param props.theme - the section's theme, or null for the unthemed group.
		* @param props.count - the section's Session count.
		* @param props.accountKey - the project folder account owning the theme.
		* @param props.seat - the theme verbs and account lists.
		* @param props.t - the browser root's locale seat.
		* @returns the section header element.
		*/
		function ThemeSectionHeader({ theme, count, accountKey, seat, t }) {
			const [open, setOpen] = (0, react.useState)(false);
			const name = theme === null ? t("theme.none") : theme.name;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: Cards_module_css_default.themeHeader,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: clsx(Cards_module_css_default.themeDot, theme === null && Cards_module_css_default.themeDotUnthemed),
						style: theme === null ? void 0 : { background: themeColor(theme.colorSlot) },
						"aria-hidden": "true"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Cards_module_css_default.themeName,
						children: name
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: Cards_module_css_default.themeCount,
						children: t(count === 1 ? "sessions.count.one" : "sessions.count.other", { n: count })
					}),
					theme !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
						open,
						onClose: () => {
							setOpen(false);
						},
						items: [{
							id: "rename",
							label: t("theme.rename"),
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular, {})
						}, {
							id: "delete",
							label: t("theme.delete"),
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutlineRegular, {}),
							danger: true
						}],
						onSelect: (id) => {
							setOpen(false);
							if (id === "rename") seat.onRename(accountKey, theme);
							else seat.onDelete(accountKey, theme.id);
						},
						align: "end",
						portal: true,
						closeOnPointerLeave: true,
						anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: Cards_module_css_default.themeMenuButton,
							"aria-label": t("theme.actions.aria", { name }),
							"aria-haspopup": "menu",
							onClick: () => {
								setOpen((v) => !v);
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutlineRegular, {})
						})
					})
				]
			});
		}
		/**
		* The grouped card body: one section per Workspace, each a folder card over
		* its Session cards. A collapsed group keeps its folder card, so the fold
		* reads the same in both presentations, and the overflow control appears under
		* the same budget it does in the row tree.
		* @param props.foldedGroups - derived group sections in render order, each
		* already paired with the rows its current budget leaves visible.
		* @param props.seat - the shared per-Session card facts and verbs.
		* @param props.folders - the folder card's callbacks and flags.
		* @param props.themes - the account theme lists and the theme verbs.
		* @returns the group sections, in place inside the owner's scrolling list.
		*/
		function CardGroups({ foldedGroups, seat, folders, themes }) {
			const { t } = seat;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: foldedGroups.map(({ group, sessions, foldedCount, hiddenCount }) => {
				const label = group.workspaceId === void 0 ? t("group.ungrouped") : group.label;
				const accountThemes = themes.byAccount[group.key] ?? [];
				const sections = accountThemes.length === 0 ? null : deriveThemeSections(sessions, accountThemes, themes.assigned);
				const workspaceId = group.workspaceId;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: Cards_module_css_default.cardGroup,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Cards_module_css_default.folderCard,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProjectRowItem, {
								newShortcut: folders.newShortcut,
								group,
								containsCurrentDescendant: group.containsCurrent,
								home: folders.home,
								pinned: workspaceId === void 0 ? void 0 : folders.pinned[workspaceId] === true,
								color: workspaceId === void 0 ? void 0 : folders.color[workspaceId],
								t,
								onToggle: () => {
									folders.onToggleGroup(group);
								},
								onCreate: () => {
									folders.onNewSession(group);
								},
								actions: workspaceId === void 0 ? void 0 : {
									rename: () => {
										folders.onRename(workspaceId, group.label);
									},
									delete: () => {
										folders.onDelete(workspaceId, group.label);
									},
									togglePin: () => {
										folders.setPinned(workspaceId, folders.pinned[workspaceId] !== true);
									},
									setColor: (color) => {
										folders.setColor(workspaceId, color);
									}
								}
							})
						}),
						group.expanded && sessions.length > 0 && (sections === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardGrid, {
							nodes: sessions,
							seat,
							label
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: Cards_module_css_default.themeSections,
							children: sections.map((section) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: clsx(Cards_module_css_default.themeSection, section.theme === null ? Cards_module_css_default.themeSectionUnthemed : Cards_module_css_default.themeSectionThemed),
								style: section.theme === null ? void 0 : { "--theme-tint": themeColor(section.theme.colorSlot) },
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThemeSectionHeader, {
									theme: section.theme,
									count: section.sessions.length,
									accountKey: group.key,
									seat: themes,
									t
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardGrid, {
									nodes: section.sessions,
									seat,
									label: t("theme.group.aria", {
										group: label,
										theme: section.theme === null ? t("theme.none") : section.theme.name
									})
								})]
							}, section.key))
						})),
						group.expanded && foldedCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: Cards_module_css_default.cardOverflowButton,
							"aria-expanded": hiddenCount === 0,
							onClick: () => {
								folders.onToggleOverflow(group.key);
							},
							children: hiddenCount === 0 ? t("sessions.collapse") : t("sessions.expand", { n: hiddenCount })
						})
					]
				}, group.key);
			}) });
		}
		//#endregion
		//#region \0dsh-css:packages/client/ui-workspace/src/client/rows/AnimatedRows.module.css.mjs
		const css$2 = ".y3TNyG_exits{contain:strict;pointer-events:none;position:absolute;inset:0;overflow:clip}";
		const tagId$2 = "@deepseek-ai/dsh-client-ui-workspace/AnimatedRows.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-workspace";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var AnimatedRows_module_css_default = { "exits": "y3TNyG_exits" };
		//#endregion
		//#region src/client/rows/AnimatedRows.tsx
		/** React-commit-driven movement and entry/exit fades for the sidebar's keyed rows. */
		const ROW_FADE_MS = 100;
		const ROW_GLIDE_MS = 200;
		function sameRows(previous, next) {
			return previous.rowKeys.length === next.rowKeys.length && previous.rowKeys.every((key, index) => key === next.rowKeys[index]);
		}
		function intersects(row, viewport) {
			return row.bottom > viewport.top && row.top < viewport.bottom && row.right > viewport.left && row.left < viewport.right;
		}
		/**
		* Animates keyed sidebar rows only when their rendered membership or order changes.
		* Motion starts after the first pointer or keyboard input inside the mounted list.
		* The parent supplies a positioned container for the inert exit overlay.
		*/
		var AnimatedRows = class extends react.Component {
			armed = false;
			list = (0, react.createRef)();
			overlay = (0, react.createRef)();
			movements = /* @__PURE__ */ new Map();
			exits = /* @__PURE__ */ new Map();
			getSnapshotBeforeUpdate(previous) {
				const list = this.list.current;
				if (!this.armed || sameRows(previous, this.props) || previous.resetKey !== this.props.resetKey || !previous.ready || !this.props.ready || list === null || typeof list.animate !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
				const viewport = list.getBoundingClientRect();
				const positions = this.readPositions();
				const nextKeys = new Set(this.props.rowKeys);
				const removed = /* @__PURE__ */ new Map();
				for (const [key, row] of positions) {
					if (nextKeys.has(key) || !intersects(row.rect, viewport)) continue;
					const clone = row.element.cloneNode(true);
					clone.removeAttribute("data-row-key");
					clone.inert = true;
					clone.style.setProperty("--dsh-workspace-indent", getComputedStyle(row.element).getPropertyValue("--dsh-workspace-indent"));
					removed.set(key, {
						...row,
						element: clone
					});
				}
				return {
					positions,
					removed
				};
			}
			componentDidUpdate(previous, _state, snapshot) {
				if (snapshot === null) {
					if (!sameRows(previous, this.props) || previous.resetKey !== this.props.resetKey || previous.ready !== this.props.ready) this.clear();
					return;
				}
				this.cancelMovements();
				const list = this.list.current;
				const overlay = this.overlay.current;
				const viewport = list.getBoundingClientRect();
				const origin = overlay.getBoundingClientRect();
				const positions = this.readPositions();
				for (const [key, row] of positions) {
					this.removeExit(key);
					const previousRow = snapshot.positions.get(key);
					if (!intersects(row.rect, viewport) && (previousRow === void 0 || !intersects(previousRow.rect, viewport))) continue;
					if (previousRow === void 0) {
						this.move(row.element, [{ opacity: 0 }, { opacity: 1 }], ROW_FADE_MS);
						continue;
					}
					const dx = previousRow.rect.left - row.rect.left;
					const dy = previousRow.rect.top - row.rect.top;
					if (dx === 0 && dy === 0 && previousRow.opacity === 1) continue;
					this.move(row.element, [{
						transform: `translate(${String(dx)}px, ${String(dy)}px)`,
						opacity: previousRow.opacity
					}, {
						transform: "translate(0, 0)",
						opacity: 1
					}], ROW_GLIDE_MS);
				}
				for (const [key, row] of snapshot.removed) {
					const { element } = row;
					this.removeExit(key);
					Object.assign(element.style, {
						position: "absolute",
						margin: "0",
						transform: "none",
						boxSizing: "border-box",
						left: `${String(row.rect.left - origin.left)}px`,
						top: `${String(row.rect.top - origin.top)}px`,
						width: `${String(row.rect.width)}px`,
						height: `${String(row.rect.height)}px`
					});
					overlay.append(element);
					const animation = element.animate([{ opacity: row.opacity }, { opacity: 0 }], {
						duration: ROW_FADE_MS,
						easing: "ease-out",
						fill: "forwards"
					});
					this.exits.set(key, {
						element,
						animation
					});
					animation.onfinish = () => {
						this.removeExit(key);
					};
				}
			}
			componentWillUnmount() {
				this.clear();
			}
			readPositions() {
				const rows = this.list.current.querySelectorAll("[data-row-key]");
				return new Map(Array.from(rows, (element) => [element.dataset.rowKey, {
					element,
					rect: element.getBoundingClientRect(),
					opacity: this.movements.has(element) ? Number(getComputedStyle(element).opacity) : 1
				}]));
			}
			move(element, keyframes, duration) {
				const animation = element.animate(keyframes, {
					duration,
					easing: "ease-out"
				});
				this.movements.set(element, animation);
				animation.onfinish = () => {
					this.movements.delete(element);
					animation.cancel();
				};
			}
			cancelMovements() {
				for (const animation of this.movements.values()) {
					animation.onfinish = null;
					animation.cancel();
				}
				this.movements.clear();
			}
			removeExit(key) {
				const exit = this.exits.get(key);
				if (exit === void 0) return;
				exit.animation.onfinish = null;
				exit.animation.cancel();
				exit.element.remove();
				this.exits.delete(key);
			}
			clear() {
				this.cancelMovements();
				for (const key of this.exits.keys()) this.removeExit(key);
			}
			render() {
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					ref: this.list,
					className: this.props.className,
					role: "tree",
					"aria-label": this.props.label,
					onPointerDownCapture: () => {
						this.armed = true;
					},
					onKeyDownCapture: () => {
						this.armed = true;
					},
					children: this.props.children
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					ref: this.overlay,
					className: AnimatedRows_module_css_default.exits,
					"aria-hidden": "true"
				})] });
			}
		};
		//#endregion
		//#region \0dsh-css:packages/client/ui-workspace/src/client/WorkspacePicker.module.css.mjs
		const css$1 = ".gal4rG_modalAction{min-width:72px}.gal4rG_modalError,.gal4rG_menuStatus{margin-top:8px;font-size:12px;line-height:18px}.gal4rG_modalError{color:var(--dsw-alias-state-error-primary)}.gal4rG_menuStatus{color:var(--dsw-alias-label-secondary)}";
		const tagId$1 = "@deepseek-ai/dsh-client-ui-workspace/WorkspacePicker.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-workspace";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var WorkspacePicker_module_css_default = {
			"menuStatus": "gal4rG_menuStatus",
			"modalAction": "gal4rG_modalAction",
			"modalError": "gal4rG_modalError"
		};
		//#endregion
		//#region src/client/WorkspacePicker.tsx
		const ADD_WORKSPACE = "::add-workspace";
		/**
		* Render the pick menu plus the adoption error dialog.
		* @param props - owner-controlled flow props.
		* @returns menu + dialog elements.
		*/
		function WorkspacePickFlow({ t, open, anchorRef, useWorkspaces, createWorkspace, useDirectoryFlow, renderDirectoryFlow, onPick, onClose, addOnly = false, onBusyChange, side = "bottom", selectedId }) {
			const workspaceSnapshot = useWorkspaces((state) => state);
			const workspaces = workspaceSnapshot.items;
			const getAnchorRect = (0, react.useCallback)(() => anchorRef?.current?.getBoundingClientRect() ?? null, [anchorRef]);
			const [errorOpen, setErrorOpen] = (0, react.useState)(false);
			const [modalError, setModalError] = (0, react.useState)(null);
			const [flowOpen, setFlowOpen] = (0, react.useState)(false);
			const [pickingFolder, setPickingFolder] = (0, react.useState)(false);
			const flowBusy = flowOpen || pickingFolder;
			(0, react.useEffect)(() => {
				onBusyChange?.(flowBusy);
			}, [flowBusy, onBusyChange]);
			const flowAvailable = useDirectoryFlow((occupied) => occupied);
			(0, react.useEffect)(() => {
				if (flowOpen && !flowAvailable) setFlowOpen(false);
			}, [flowOpen, flowAvailable]);
			const addEntries = flowAvailable ? [{
				id: ADD_WORKSPACE,
				label: t("menu.addWorkspace"),
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 16 }),
				disabled: flowBusy
			}] : [];
			const pinAdd = !addOnly && workspaces.length > 0;
			const items = pinAdd ? workspaces.map((workspace) => ({
				id: workspace.workspaceId,
				label: workspaceDisplayTitle(workspace.title, t("workspace.defaultName")),
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderCloseRegular, { size: 16 }),
				disabled: flowBusy
			})) : addEntries;
			const menuIsEmpty = items.length === 0;
			const closeModal = () => {
				setErrorOpen(false);
				setModalError(null);
			};
			/** Adopt a picked directory; failures land in the folder-error dialog (Choose again reopens the flow). */
			const adoptDirectory = (path) => createWorkspace({ path }).then((workspace) => {
				setFlowOpen(false);
				onPick(workspace.workspaceId);
			}).catch((reason) => {
				setModalError(reason instanceof Error ? reason.message : String(reason));
				setFlowOpen(false);
				setErrorOpen(true);
			});
			const openDirectoryFlow = (0, react.useCallback)(() => {
				onClose();
				setErrorOpen(false);
				setModalError(null);
				setFlowOpen(true);
			}, [onClose]);
			const listSettled = addOnly || workspaceSnapshot.phase === "ready";
			const addIsTheOnlyEntry = !pinAdd && listSettled && addEntries.length === 1;
			(0, react.useEffect)(() => {
				if (open && addIsTheOnlyEntry && !flowBusy) openDirectoryFlow();
			}, [
				open,
				addIsTheOnlyEntry,
				flowBusy,
				openDirectoryFlow
			]);
			/** Owner side of the flow conversation: adopt keeps the flow open (busy) until the Host answers. */
			const flowOwner = {
				open: flowOpen,
				busy: pickingFolder,
				onPicked: (path) => {
					setPickingFolder(true);
					adoptDirectory(path).finally(() => {
						setPickingFolder(false);
					});
				},
				onCancel: () => {
					setFlowOpen(false);
				},
				onError: (message) => {
					setFlowOpen(false);
					setModalError(message);
					setErrorOpen(true);
				}
			};
			const handleSelect = (id) => {
				if (id === ADD_WORKSPACE) {
					openDirectoryFlow();
					return;
				}
				onPick(id);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
					open: open && !addIsTheOnlyEntry && !menuIsEmpty,
					anchor: null,
					items,
					...pinAdd ? { footer: addEntries } : {},
					selectedId,
					onSelect: handleSelect,
					onClose,
					side,
					portal: true,
					getAnchorRect
				}),
				open && !addIsTheOnlyEntry && !menuIsEmpty && workspaceSnapshot.phase === "pending" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: WorkspacePicker_module_css_default.menuStatus,
					role: "status",
					children: t("picker.loading")
				}),
				renderDirectoryFlow(flowOwner),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
					open: errorOpen,
					onClose: closeModal,
					closeLabel: t("close"),
					title: t("folderError.title"),
					footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						className: WorkspacePicker_module_css_default.modalAction,
						onClick: closeModal,
						children: t("cancel")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "primary",
						className: WorkspacePicker_module_css_default.modalAction,
						disabled: !flowAvailable,
						onClick: openDirectoryFlow,
						children: t("folderError.retry")
					})] }),
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: WorkspacePicker_module_css_default.modalError,
						role: "alert",
						children: modalError
					})
				})
			] });
		}
		/**
		* The conversation empty-state registration: adapts the owner share to the
		* core flow (all state and semantics live in the flow / the owner).
		* @param props - empty-state slot props (owner share + injected creation callback).
		* @returns the flow element.
		*/
		function WorkspacePicker({ open, anchorRef, useWorkspaces, selectedId, onPick, onClose, createWorkspace, useDirectoryFlow, renderSlot, t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkspacePickFlow, {
				t,
				open,
				anchorRef,
				useWorkspaces,
				createWorkspace,
				useDirectoryFlow,
				renderDirectoryFlow: (owner) => renderSlot("conversation.hero.workspace.directoryFlow", owner),
				selectedId,
				onPick,
				onClose
			});
		}
		//#endregion
		//#region \0dsh-css:packages/client/ui-workspace/src/client/rows/WorkspaceBrowser.module.css.mjs
		const css = ".cIg9ca_root{--dsh-session-list-edge-inset:var(--dsh-sidebar-inline-padding);--dsh-session-list-scrollbar-width:5px;--dsh-session-list-scrollbar-offset:2px;box-sizing:border-box;min-height:0;padding-right:var(--dsh-session-list-edge-inset);flex-direction:column;flex:1;display:flex}.cIg9ca_root.cIg9ca_rail{padding-right:0}.cIg9ca_iconButton{border-radius:var(--dsw-radius-sm);cursor:pointer;width:28px;height:28px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.cIg9ca_iconButton:focus-visible,.cIg9ca_searchButton:focus-visible,.cIg9ca_clearButton:focus-visible{outline:var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:-2px}.cIg9ca_iconButton:hover{background:var(--dsw-alias-interactive-bg-hover)}.cIg9ca_viewOptionsMenu{min-width:200px}.cIg9ca_sectionHeader{box-sizing:border-box;border-radius:var(--dsw-radius-md);height:36px;color:var(--dsw-alias-label-tertiary);flex:none;justify-content:flex-end;align-items:center;gap:4px;margin-bottom:4px;padding-left:4px;display:flex;overflow:hidden}.cIg9ca_root:not(.cIg9ca_rail) .cIg9ca_sectionHeader{margin-top:2px;margin-right:-4px}.cIg9ca_sectionLabel{white-space:nowrap;opacity:1;visibility:visible;min-width:0;max-width:45%;transition:max-width .18s var(--ds-ease-in-out), margin-right .18s var(--ds-ease-in-out), opacity .12s var(--ds-ease-in-out), transform .18s var(--ds-ease-in-out), visibility 0s linear;flex:none;line-height:20px;overflow:hidden}.cIg9ca_sectionLabelHidden{opacity:0;visibility:hidden;max-width:0;margin-right:-4px;transition-delay:0s,0s,0s,0s,.18s;transform:translate(-4px)}.cIg9ca_searchSlot{box-sizing:border-box;min-width:0;max-width:28px;transition:max-width .18s var(--ds-ease-in-out), padding-left .18s var(--ds-ease-in-out);flex:1;align-items:center;margin-left:auto;padding-left:0;display:flex}.cIg9ca_searchSlotExpanded{max-width:100%;padding-left:0}.cIg9ca_headerActions{opacity:1;visibility:visible;max-width:60px;transition:max-width .18s var(--ds-ease-in-out), opacity .12s var(--ds-ease-in-out), transform .18s var(--ds-ease-in-out), visibility 0s linear;flex:none;align-items:center;gap:4px;display:flex;overflow:hidden}.cIg9ca_headerActionsHidden{opacity:0;visibility:hidden;pointer-events:none;max-width:0;transition-delay:0s,0s,0s,.18s;transform:translate(4px)}.cIg9ca_search{box-sizing:border-box;border-radius:var(--dsw-radius-sm);cursor:text;width:100%;height:28px;color:var(--dsw-alias-label-secondary);transition:width .18s var(--ds-ease-in-out), padding .18s var(--ds-ease-in-out), border-color .18s var(--ds-ease-in-out), background-color .18s var(--ds-ease-in-out);background:0 0;border:none;flex:none;align-items:center;gap:0;margin:0;padding:0;display:flex;overflow:hidden}.cIg9ca_searchExpanded{border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);width:calc(100% + 4px);height:30px;color:var(--dsw-alias-label-caption);background:0 0;margin-inline:-2px;padding:0 4px 0 0}.cIg9ca_searchButton{border-radius:var(--dsw-radius-sm);cursor:pointer;width:28px;height:28px;color:inherit;background:0 0;border:none;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.cIg9ca_searchExpanded .cIg9ca_searchButton{width:28px;height:30px}.cIg9ca_searchButton:hover{background:var(--dsw-alias-interactive-bg-hover)}.cIg9ca_searchExpanded .cIg9ca_searchButton:hover{background:0 0}.cIg9ca_searchInput{opacity:0;pointer-events:none;width:0;min-width:0;color:var(--dsw-alias-label-primary);transition:opacity .12s var(--ds-ease-in-out);background:0 0;border:none;outline:none;flex:1;font-size:13px;line-height:18px}.cIg9ca_searchExpanded .cIg9ca_searchInput{opacity:1;pointer-events:auto;margin-left:-2px}.cIg9ca_searchInput::placeholder{color:var(--dsw-alias-label-tertiary)}.cIg9ca_clearButton{border-radius:var(--dsw-radius-sm);cursor:pointer;width:24px;height:24px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;flex:none;justify-content:center;align-items:center;padding:0;display:inline-flex}.cIg9ca_clearButton:hover{background:var(--dsw-alias-interactive-bg-hover)}.cIg9ca_rail .cIg9ca_sectionHeader{justify-content:flex-start;gap:0;margin-bottom:12px;padding-left:0}.cIg9ca_rail .cIg9ca_headerActions{max-width:none}.cIg9ca_rail .cIg9ca_iconButton{border-radius:var(--dsw-radius-md);width:36px;height:36px;color:var(--dsw-alias-label-primary)}.cIg9ca_rail .cIg9ca_search{border-radius:var(--dsw-radius-md);background:0 0;border-color:#0000;gap:0;width:36px;height:36px;margin:0 0 12px;padding:0}.cIg9ca_rail .cIg9ca_searchButton{border-radius:var(--dsw-radius-md);width:36px;height:36px;color:var(--dsw-alias-label-primary)}.cIg9ca_rail .cIg9ca_searchButton:hover{background:var(--dsw-alias-interactive-bg-hover)}.cIg9ca_listArea{min-height:0;margin-left:-4px;margin-right:calc(-1 * var(--dsh-session-list-edge-inset));flex-direction:column;flex:1;padding-left:4px;display:flex;overflow:visible}.cIg9ca_rail .cIg9ca_listArea{margin-left:0;margin-right:0;padding-left:0}.cIg9ca_treeBody{flex-direction:column;flex:1;min-height:0;display:flex;position:relative}.cIg9ca_fade{left:0;right:var(--dsh-session-list-edge-inset);background:linear-gradient(to bottom, transparent, var(--dsw-specific-sidebar-fill));pointer-events:none;height:24px;position:absolute;bottom:0}[data-platform=darwin] .cIg9ca_fade{display:none}.cIg9ca_wide{animation:cIg9ca_wide-in .2s var(--ds-ease-in-out)}@keyframes cIg9ca_wide-in{0%{opacity:0}}.cIg9ca_list{min-height:0;margin-left:-4px;margin-right:var(--dsh-session-list-scrollbar-offset);padding-left:4px;padding-right:calc(var(--dsh-session-list-edge-inset) - var(--dsh-session-list-scrollbar-width) - var(--dsh-session-list-scrollbar-offset));scrollbar-gutter:stable;flex:1;padding-bottom:16px;overflow-y:auto}.cIg9ca_flatList>*+*,.cIg9ca_searchTree>[role=treeitem]+[role=treeitem],.cIg9ca_groupSection>*+*{margin-top:2px}.cIg9ca_searchStatus{color:var(--dsw-alias-label-tertiary);padding:10px 12px;font-size:12px;line-height:18px}.cIg9ca_skeletonRow{box-sizing:border-box;align-items:flex-start;gap:8px;min-height:48px;padding:6px 8px 7px;display:flex}.cIg9ca_skeletonDot{corner-shape:round;border-radius:50%;flex:none;width:16px;height:16px}.cIg9ca_skeletonBars{flex-direction:column;flex:1;gap:6px;min-width:0;display:flex}.cIg9ca_skeletonDot,.cIg9ca_skeletonBar{background:var(--dsw-alias-bg-skeleton);animation:2s cubic-bezier(.36,0,.64,1) infinite cIg9ca_search-skeleton}.cIg9ca_skeletonBar{border-radius:var(--dsw-radius-xs);width:65%;height:16px}.cIg9ca_skeletonBarWide{width:90%;height:13px}@keyframes cIg9ca_search-skeleton{0%{opacity:1}40%{opacity:.6}80%,to{opacity:1}}.cIg9ca_groupSection{position:relative}.cIg9ca_groupSection+.cIg9ca_groupSection{margin-top:4px}.cIg9ca_listTopDropIndicator,.cIg9ca_workspaceDropBefore:before,.cIg9ca_workspaceDropAfter:after{content:\"\";z-index:1;background:linear-gradient(55deg, transparent calc(50% - 1px), var(--dsw-alias-state-business-primary) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)) 0 0 / 5px 7px no-repeat, linear-gradient(125deg, transparent calc(50% - 1px), var(--dsw-alias-state-business-primary) calc(50% - 1px) calc(50% + 1px), transparent calc(50% + 1px)) 0 5px / 5px 7px no-repeat, linear-gradient(var(--dsw-alias-state-business-primary) 0 0) 4px 5px / calc(100% - 4px) 2px no-repeat;pointer-events:none;height:12px;position:absolute;left:0;right:0}.cIg9ca_listTopDropIndicator{top:-8px;left:0;right:var(--dsh-session-list-edge-inset)}.cIg9ca_listTopDropActive>.cIg9ca_workspaceDropBefore:first-child:before{display:none}.cIg9ca_workspaceDropBefore:before{top:-8px}.cIg9ca_workspaceDropAfter:after{bottom:-8px}.cIg9ca_sessionOverflowButton{border-radius:var(--dsw-radius-sm);width:100%;height:28px;padding:0 12px 0 calc(28px + var(--dsh-workspace-indent,0px));cursor:pointer;text-align:left;color:var(--dsw-alias-label-tertiary);background:0 0;border:none;font-size:12px}.cIg9ca_groupSection>.cIg9ca_sessionOverflowButton{margin-top:0}.cIg9ca_sessionOverflowButton:hover{color:var(--dsw-alias-label-secondary);background:0 0}.cIg9ca_empty{color:var(--dsw-alias-label-tertiary);padding:16px 12px;font-size:13px}.cIg9ca_emptyState{color:var(--dsw-alias-label-tertiary);flex-direction:column;align-items:center;gap:8px;margin-top:80px;padding:0 12px;font-size:13px;line-height:20px;display:flex}.cIg9ca_emptyState>svg{color:var(--dsw-alias-label-caption);margin-bottom:4px}.cIg9ca_emptyAction{cursor:pointer;color:var(--dsw-alias-link);background:0 0;border:none;padding:0;font-size:13px;line-height:20px}.cIg9ca_renameInput{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-lg);width:100%;height:44px;color:var(--dsw-alias-label-primary);background:0 0;outline:none;padding:7px 14px;font-size:14px;font-weight:400;line-height:22px}.cIg9ca_renameInput:disabled{color:var(--dsw-alias-label-dimmed)}.cIg9ca_renameError{color:var(--dsw-alias-state-error-primary);margin-top:8px;font-size:12px;line-height:18px}.cIg9ca_deleteAction:not(:disabled){color:var(--dsw-alias-state-error-primary)}.cIg9ca_deleteStatus{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}.cIg9ca_archiveActivity{color:var(--dsw-alias-label-primary);margin:0 0 8px;padding-left:18px;font-size:13px;line-height:20px}.cIg9ca_archiveActivity li{overflow-wrap:anywhere}@media (prefers-reduced-motion:reduce){.cIg9ca_wide,.cIg9ca_skeletonDot,.cIg9ca_skeletonBar{animation:none}.cIg9ca_search,.cIg9ca_sectionLabel,.cIg9ca_searchSlot,.cIg9ca_searchInput,.cIg9ca_headerActions{transition:none}}";
		const tagId = "@deepseek-ai/dsh-client-ui-workspace/WorkspaceBrowser.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-workspace";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var WorkspaceBrowser_module_css_default = {
			"archiveActivity": "cIg9ca_archiveActivity",
			"clearButton": "cIg9ca_clearButton",
			"deleteAction": "cIg9ca_deleteAction",
			"deleteStatus": "cIg9ca_deleteStatus",
			"empty": "cIg9ca_empty",
			"emptyAction": "cIg9ca_emptyAction",
			"emptyState": "cIg9ca_emptyState",
			"fade": "cIg9ca_fade",
			"flatList": "cIg9ca_flatList",
			"groupSection": "cIg9ca_groupSection",
			"headerActions": "cIg9ca_headerActions",
			"headerActionsHidden": "cIg9ca_headerActionsHidden",
			"iconButton": "cIg9ca_iconButton",
			"list": "cIg9ca_list",
			"listArea": "cIg9ca_listArea",
			"listTopDropActive": "cIg9ca_listTopDropActive",
			"listTopDropIndicator": "cIg9ca_listTopDropIndicator",
			"rail": "cIg9ca_rail",
			"renameError": "cIg9ca_renameError",
			"renameInput": "cIg9ca_renameInput",
			"root": "cIg9ca_root",
			"search": "cIg9ca_search",
			"search-skeleton": "cIg9ca_search-skeleton",
			"searchButton": "cIg9ca_searchButton",
			"searchExpanded": "cIg9ca_searchExpanded",
			"searchInput": "cIg9ca_searchInput",
			"searchSlot": "cIg9ca_searchSlot",
			"searchSlotExpanded": "cIg9ca_searchSlotExpanded",
			"searchStatus": "cIg9ca_searchStatus",
			"searchTree": "cIg9ca_searchTree",
			"sectionHeader": "cIg9ca_sectionHeader",
			"sectionLabel": "cIg9ca_sectionLabel",
			"sectionLabelHidden": "cIg9ca_sectionLabelHidden",
			"sessionOverflowButton": "cIg9ca_sessionOverflowButton",
			"skeletonBar": "cIg9ca_skeletonBar",
			"skeletonBarWide": "cIg9ca_skeletonBarWide",
			"skeletonBars": "cIg9ca_skeletonBars",
			"skeletonDot": "cIg9ca_skeletonDot",
			"skeletonRow": "cIg9ca_skeletonRow",
			"treeBody": "cIg9ca_treeBody",
			"viewOptionsMenu": "cIg9ca_viewOptionsMenu",
			"wide": "cIg9ca_wide",
			"wide-in": "cIg9ca_wide-in",
			"workspaceDropAfter": "cIg9ca_workspaceDropAfter",
			"workspaceDropBefore": "cIg9ca_workspaceDropBefore"
		};
		//#endregion
		//#region src/client/rows/WorkspaceBrowser.tsx
		/**
		* The workspace/session browsing region filling the sidebar shell's
		* `sidebar.workspaces` hole: section header (title + view options + add
		* workspace), search, the grouped tree or flat list, the card grid the Cards
		* grouping draws over the same groups, and the workspace and theme dialogs.
		* Wide state renders the full browser; rail state renders the two
		* region icons (search / add workspace) as 36px controls on the shell's shared
		* rail entry path, each requesting expansion through the owner share. Adding
		* is the header button's one action, so it raises the directory flow with no
		* menu in between; the flow and its error dialog live in WorkspacePicker
		* (same package — direct composition, no slot between them). A Session row's
		* "..." menu and hover buttons are the `sidebar.workspaces.session.menu.item`
		* and `sidebar.workspaces.session.row.action` lists rendered through this
		* entry's `renderSlot`; the actions in them, this package's own included,
		* are slot entries with their own behavior, so this component threads no
		* action callbacks and hosts no action surface. The card grid renders those
		* same seats from a card.
		*/
		/**
		* Column slide length (--ds-transition-duration-slow): rail-search focus waits it out —
		* focus() forces a synchronous layout and would jank the slide.
		*/
		const EXPAND_SLIDE_MS = 300;
		/** Pause between the latest keystroke and a Host content-search request. */
		const SEARCH_DEBOUNCE_MS = 250;
		/** `session.search` wire bound, measured in JavaScript UTF-16 code units. */
		const SEARCH_QUERY_MAX_CODE_UNITS = 500;
		/** Idle Session rows visible per Workspace before the local overflow control. */
		const COLLAPSED_SESSION_LIMIT = 5;
		/** Keep provisional and running rows outside the idle-session quota, including parents with running children. */
		function collapsedSessionRows(sessions, limit = COLLAPSED_SESSION_LIMIT) {
			let idleCount = 0;
			const rows = sessions.filter((session) => {
				if (session.blank || session.running || session.runningSubagentCount > 0) return true;
				if (idleCount >= limit) return false;
				idleCount += 1;
				return true;
			});
			return {
				rows,
				hiddenCount: sessions.length - rows.length
			};
		}
		/**
		* Next overflow budget for one toggle gesture, shared by the row tree and the
		* card grid: a fully visible group folds back to the base budget, and a group
		* that hides at most one more step opens completely rather than inching.
		* @param sessions - the group's derived Session rows.
		* @param current - the group's current budget, or undefined before its first fold.
		* @returns the budget the next render should apply.
		*/
		function toggledSessionLimit(sessions, current) {
			const visible = collapsedSessionRows(sessions, current);
			if (visible.hiddenCount === 0) return COLLAPSED_SESSION_LIMIT;
			return visible.hiddenCount <= COLLAPSED_SESSION_LIMIT ? Infinity : (current ?? COLLAPSED_SESSION_LIMIT) + COLLAPSED_SESSION_LIMIT;
		}
		/** Keep controlled input and RPC payload inside the session.search wire contract. */
		function sanitizeSearchQuery(value) {
			const withoutNul = value.replaceAll("\0", "");
			if (withoutNul.length <= SEARCH_QUERY_MAX_CODE_UNITS) return withoutNul;
			let end = SEARCH_QUERY_MAX_CODE_UNITS;
			const last = withoutNul.charCodeAt(end - 1);
			const next = withoutNul.charCodeAt(end);
			if (last >= 55296 && last <= 56319 && next >= 56320 && next <= 57343) end--;
			return withoutNul.slice(0, end);
		}
		/**
		* Accept the native drag at document level while a row drag is active: row
		* hover still owns the insertion marker, and releasing outside the list must
		* not be rendered as a rejected drop before dragend commits that last marker.
		*/
		function useNativeDragAcceptance(active) {
			(0, react.useEffect)(() => {
				if (!active) return;
				const acceptDrag = (event) => {
					event.preventDefault();
					if (event.dataTransfer !== null) event.dataTransfer.dropEffect = "move";
				};
				const acceptDrop = (event) => {
					event.preventDefault();
				};
				document.addEventListener("dragover", acceptDrag);
				document.addEventListener("drop", acceptDrop);
				return () => {
					document.removeEventListener("dragover", acceptDrag);
					document.removeEventListener("drop", acceptDrop);
				};
			}, [active]);
		}
		/** Grouping, ordering, and archived-filter menu; own open state so it resets with the wide chrome. */
		function ViewOptionsMenu({ groupBy, orderBy, archivedFilter, onGroupPick, onOrderPick, onArchivedFilterPick, t }) {
			const [open, setOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open,
				onClose: () => {
					setOpen(false);
				},
				items: [
					{
						type: "label",
						id: "group-by",
						text: t("groupBy.label")
					},
					{
						id: "workspace",
						label: t("groupBy.workspace"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderCloseRegular, {})
					},
					{
						id: "workspace-tree",
						label: t("groupBy.workspaceTree"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWorkspaceTreeOutlineRegular, {})
					},
					{
						id: "flat",
						label: t("groupBy.flat"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFlatListOutlineRegular, {})
					},
					{
						id: "cards",
						label: t("groupBy.cards"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardViewGlyph, {})
					},
					{
						type: "separator",
						id: "order-by-separator"
					},
					{
						type: "label",
						id: "order-by",
						text: t("orderBy.label")
					},
					{
						id: "manual",
						label: t("orderBy.manual"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronsUpDownOutlineRegular, {})
					},
					{
						id: "updated",
						label: t("orderBy.updated"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconClockOutlineRegular, {})
					},
					{
						type: "separator",
						id: "archived-filter-separator"
					},
					{
						type: "label",
						id: "filter-by",
						text: t("filterBy.label")
					},
					{
						id: "hide-archived",
						label: t("viewOptions.hideArchived"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconArchiveOffOutlineRegular, {})
					},
					{
						id: "show-archived",
						label: t("viewOptions.showArchived"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconQueueOutlineRegular, {})
					},
					{
						id: "only-archived",
						label: t("viewOptions.onlyArchived"),
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconArchiveCheckOutlineRegular, {})
					}
				],
				selectedIds: [
					groupBy,
					orderBy,
					{
						default: "hide-archived",
						show: "show-archived",
						only: "only-archived"
					}[archivedFilter]
				],
				onSelect: (id) => {
					if (id === "workspace" || id === "workspace-tree" || id === "flat" || id === "cards") onGroupPick(id);
					else if (id === "manual" || id === "updated") onOrderPick(id);
					else if (id === "hide-archived") onArchivedFilterPick("default");
					else if (id === "show-archived") onArchivedFilterPick("show");
					else if (id === "only-archived") onArchivedFilterPick("only");
					setOpen(false);
				},
				align: "end",
				dense: true,
				listClassName: WorkspaceBrowser_module_css_default.viewOptionsMenu,
				portal: true,
				anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
					label: t("viewOptions.label"),
					side: "bottom",
					delayMs: 500,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: clsx(WorkspaceBrowser_module_css_default.iconButton, WorkspaceBrowser_module_css_default.wide),
						"aria-label": t("viewOptions.label"),
						onClick: () => {
							setOpen((v) => !v);
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSlidersTwoOutlineRegular, {})
					})
				})
			});
		}
		/** Apply a visible drop to the complete account without removing hidden members. */
		function sessionDragOrder(order, rows, drag, over) {
			const source = rows.find((row) => row.id === drag.sessionId);
			const target = rows.find((row) => row.id === over.id);
			if (source === void 0 || target === void 0 || source.blank || source.pinned !== drag.pinned || target.pinned !== drag.pinned || source.id === target.id || !order.includes(source.id)) return;
			const section = rows.filter((row) => row.pinned === drag.pinned);
			const sourceIndex = section.findIndex((row) => row.id === source.id);
			if (section.filter((row) => row.id !== source.id).findIndex((row) => row.id === target.id) + (over.half === "after" ? 1 : 0) === sourceIndex) return;
			const next = order.filter((id) => id !== source.id);
			const targetIndex = next.indexOf(target.id);
			if (targetIndex === -1) return;
			next.splice(targetIndex + (over.half === "after" ? 1 : 0), 0, source.id);
			return pinCurrentBlank(next, rows.find((row) => row.blank)?.id);
		}
		/** Resolve an insertion side across the Workspace header, descendants, and Sessions. */
		function workspaceGroupHalf(e) {
			const rect = e.currentTarget.getBoundingClientRect();
			return e.clientY < rect.top + rect.height / 2 ? "before" : "after";
		}
		/** The list-empty placeholder — a glyph over the text; the archived-only view names its filter and offers the way back. */
		function EmptySessions({ rowState, onLeaveArchivedOnly, t }) {
			const archivedOnly = rowState.archivedFilter === "only";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: WorkspaceBrowser_module_css_default.emptyState,
				"data-row-key": "empty",
				children: [
					archivedOnly ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconArchiveOutlineRegular, { size: 24 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconQueueOutlineRegular, { size: 24 }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: archivedOnly ? t("empty.noneArchived") : t("empty.none") }),
					archivedOnly && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: WorkspaceBrowser_module_css_default.emptyAction,
						onClick: onLeaveArchivedOnly,
						children: t("empty.viewOthers")
					})
				]
			});
		}
		/** The scrolling session tree; unmounting drops the sessions subscription and local row limits. */
		function SessionTree({ list, useSessionStatus, startSession, open, workspaces, ungroupedSessionIds, rowState, onLeaveArchivedOnly, workspaceReady, animationResetKey, usePanelInfo, onRenameRequest, onDeleteRequest, onSessionRenameRequest, renderSlot, insertWorkspaceBefore, nestWorkspaces, groupExpansion, setGroupExpanded, workspaceColor, setWorkspaceColor, workspacePinned, setWorkspacePinned, setSessionOrder, home, t, revealSessionId, onSessionRevealed, shortcuts, presentation, themeSeat, themeGroups }) {
			const panelActive = usePanelInfo((info) => info.activePanelId !== null);
			const statuses = useSessionStatus((s) => s);
			const current = panelActive ? void 0 : Object.values(list.byId).find((session) => (session.retainedBy.mainView ?? 0) > 0)?.id;
			const revealGroup = revealSessionId === void 0 || !workspaceReady ? void 0 : owningGroupKey(workspaces, revealSessionId);
			const [sessionLimits, setSessionLimits] = (0, react.useState)({});
			const [drag, setDrag] = (0, react.useState)(null);
			const sessionDropCommitted = (0, react.useRef)(false);
			const [workspaceDrag, setWorkspaceDrag] = (0, react.useState)(null);
			const workspaceDropCommitted = (0, react.useRef)(false);
			const nativeDragActive = drag !== null || workspaceDrag !== null;
			useNativeDragAcceptance(nativeDragActive);
			const currentGroup = current === void 0 || !workspaceReady ? void 0 : owningGroupKey(workspaces, current);
			(0, react.useEffect)(() => {
				if (current === void 0 || currentGroup === void 0 || Object.hasOwn(groupExpansion, currentGroup)) return;
				setGroupExpanded(currentGroup, true);
			}, [
				current,
				currentGroup,
				setGroupExpanded,
				groupExpansion
			]);
			const parents = (0, react.useMemo)(() => {
				if (!nestWorkspaces) return /* @__PURE__ */ new Map();
				const keysByPath = new Map(workspaces.map((workspace) => [workspace.path, workspace.workspaceId]));
				const paths = [...keysByPath.keys()];
				return new Map(workspaces.map((workspace) => {
					const path = owningParentFolder(workspace.path, paths);
					return [workspace.workspaceId, path === void 0 ? void 0 : keysByPath.get(path)];
				}));
			}, [nestWorkspaces, workspaces]);
			const currentAncestors = (0, react.useMemo)(() => {
				const keys = /* @__PURE__ */ new Set();
				for (let key = currentGroup === void 0 ? void 0 : parents.get(currentGroup); key !== void 0; key = parents.get(key)) keys.add(key);
				return keys;
			}, [currentGroup, parents]);
			const expandedGroups = (0, react.useMemo)(() => {
				const ancestorKeys = new Set(parents.values());
				return [...workspaces.map((workspace) => workspace.workspaceId), ""].filter((key) => groupExpansion[key] ?? ancestorKeys.has(key));
			}, [
				groupExpansion,
				parents,
				workspaces
			]);
			const groups = (0, react.useMemo)(() => deriveGroups(list, workspaces, rowState, statuses, {
				expandedGroups,
				ungroupedOrder: ungroupedSessionIds
			}), [
				list,
				workspaces,
				rowState,
				statuses,
				expandedGroups,
				ungroupedSessionIds
			]);
			(0, react.useEffect)(() => {
				for (let key = revealGroup; key !== void 0; key = parents.get(key)) if (groupExpansion[key] === false || key === revealGroup && groupExpansion[key] !== true) setGroupExpanded(key, true);
			}, [
				groupExpansion,
				parents,
				revealGroup,
				setGroupExpanded
			]);
			(0, react.useEffect)(() => {
				if (revealSessionId === void 0 || revealGroup === void 0) return;
				const group = groups.find((candidate) => candidate.key === revealGroup);
				if (group === void 0 || !group.expanded || !group.sessions.some((row) => row.id === revealSessionId)) return;
				if (collapsedSessionRows(group.sessions).rows.some((row) => row.id === revealSessionId)) {
					if (presentation === "cards") onSessionRevealed(revealSessionId);
					return;
				}
				setSessionLimits((limits) => limits[revealGroup] === Infinity ? limits : {
					...limits,
					[revealGroup]: Infinity
				});
			}, [
				groups,
				onSessionRevealed,
				presentation,
				revealGroup,
				revealSessionId
			]);
			const now = Date.now();
			const commitSessionDrag = (activeDrag, over) => {
				if (sessionDropCommitted.current) return;
				sessionDropCommitted.current = true;
				setDrag(null);
				const group = groups.find((candidate) => candidate.key === activeDrag.accountKey);
				if (group === void 0) return;
				if (over.id === activeDrag.sessionId) return;
				const accountSessionIds = activeDrag.accountKey === "" ? ungroupedSessionIds : workspaces.find((workspace) => workspace.workspaceId === activeDrag.accountKey)?.sessionIds;
				if (accountSessionIds === void 0) return;
				const renderedSessions = collapsedSessionRows(group.sessions, sessionLimits[group.key]).rows;
				const nextOrder = sessionDragOrder(accountSessionIds, renderedSessions, activeDrag, over);
				if (nextOrder !== void 0) setSessionOrder(activeDrag.accountKey, nextOrder);
			};
			const commitWorkspaceDrag = (activeDrag, over) => {
				if (workspaceDropCommitted.current) return;
				workspaceDropCommitted.current = true;
				setWorkspaceDrag(null);
				const owner = parents.get(activeDrag.workspaceId);
				const siblings = workspaces.filter((workspace) => parents.get(workspace.workspaceId) === owner);
				const rowIndex = siblings.findIndex((workspace) => workspace.workspaceId === over.id);
				if (rowIndex === -1) return;
				const anchor = over.half === "before" ? over.id : siblings[rowIndex + 1]?.workspaceId;
				if (anchor === activeDrag.workspaceId) return;
				const sourceIndex = siblings.findIndex((workspace) => workspace.workspaceId === activeDrag.workspaceId);
				const anchorIndex = anchor === void 0 ? siblings.length : siblings.findIndex((workspace) => workspace.workspaceId === anchor);
				if (sourceIndex !== -1 && (anchorIndex === sourceIndex || anchorIndex === sourceIndex + 1)) return;
				insertWorkspaceBefore(activeDrag.workspaceId, anchor).catch((reason) => {
					console.warn("workspace reorder rejected:", reason);
				});
			};
			const childrenByParent = (0, react.useMemo)(() => {
				const rendered = new Set(groups.map((group) => group.key));
				const children = /* @__PURE__ */ new Map();
				for (const group of groups) {
					let parent = parents.get(group.key);
					while (parent !== void 0 && !rendered.has(parent)) parent = parents.get(parent);
					const siblings = children.get(parent);
					if (siblings === void 0) children.set(parent, [group]);
					else siblings.push(group);
				}
				return children;
			}, [groups, parents]);
			const rootGroups = childrenByParent.get(void 0) ?? [];
			const workspaceDropAtListStart = rootGroups[0]?.workspaceId !== void 0 && workspaceDrag?.over?.id === rootGroups[0].workspaceId && workspaceDrag.over.half === "before";
			const rowKeys = groups.length === 0 ? ["empty"] : [];
			const renderGroup = (group, depth) => {
				const workspaceId = group.workspaceId;
				const children = childrenByParent.get(group.key) ?? [];
				const compatibleDrag = workspaceDrag !== null && parents.get(workspaceDrag.workspaceId) === parents.get(group.key);
				const collapsed = collapsedSessionRows(group.sessions);
				const visible = collapsedSessionRows(group.sessions, sessionLimits[group.key]);
				const sessionsExpanded = visible.hiddenCount === 0;
				rowKeys.push(`workspace:${group.key}`);
				const childRows = group.expanded ? children.map((child) => renderGroup(child, depth + 1)) : [];
				const sessions = visible.rows;
				for (const node of sessions) rowKeys.push(`session:${node.id}`);
				if (collapsed.hiddenCount > 0) rowKeys.push(`overflow:${group.key}`);
				const workspaceMarker = workspaceId !== void 0 && workspaceDrag?.over?.id === workspaceId ? workspaceDrag.over.half : null;
				const workspaceDragProps = workspaceId === void 0 ? void 0 : {
					start: () => {
						workspaceDropCommitted.current = false;
						setWorkspaceDrag({
							workspaceId,
							over: null
						});
					},
					end: () => {
						if (workspaceDrag?.over !== null && workspaceDrag?.over !== void 0) commitWorkspaceDrag(workspaceDrag, workspaceDrag.over);
						else setWorkspaceDrag(null);
						workspaceDropCommitted.current = false;
					}
				};
				const hoverWorkspace = workspaceId === void 0 || !compatibleDrag ? void 0 : (half) => {
					setWorkspaceDrag((active) => active === null ? active : {
						...active,
						over: {
							id: workspaceId,
							half
						}
					});
				};
				const dropWorkspace = workspaceId === void 0 || !compatibleDrag ? void 0 : (half) => {
					commitWorkspaceDrag(workspaceDrag, {
						id: workspaceId,
						half
					});
				};
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: { "--dsh-workspace-indent": `${depth * 12}px` },
					className: clsx(WorkspaceBrowser_module_css_default.groupSection, workspaceMarker === "before" && WorkspaceBrowser_module_css_default.workspaceDropBefore, workspaceMarker === "after" && WorkspaceBrowser_module_css_default.workspaceDropAfter),
					onDragOver: workspaceDrag === null ? void 0 : (e) => {
						e.preventDefault();
						if (hoverWorkspace === void 0 && parents.get(group.key) !== void 0) return;
						e.stopPropagation();
						if (hoverWorkspace === void 0) {
							e.dataTransfer.dropEffect = "none";
							if (workspaceDrag.over !== null) setWorkspaceDrag({
								...workspaceDrag,
								over: null
							});
						} else {
							e.dataTransfer.dropEffect = "move";
							hoverWorkspace(workspaceGroupHalf(e));
						}
					},
					onDrop: workspaceDrag === null ? void 0 : (e) => {
						e.preventDefault();
						if (dropWorkspace === void 0 && parents.get(group.key) !== void 0) return;
						e.stopPropagation();
						if (dropWorkspace === void 0) {
							workspaceDropCommitted.current = true;
							setWorkspaceDrag(null);
						} else dropWorkspace(workspaceGroupHalf(e));
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProjectRowItem, {
							newShortcut: shortcuts.find((row) => row.id === "session.new"),
							color: group.workspaceId === void 0 ? void 0 : workspaceColor[group.workspaceId],
							pinned: group.workspaceId === void 0 ? void 0 : workspacePinned[group.workspaceId] === true,
							group,
							containsCurrentDescendant: currentAncestors.has(group.key),
							home,
							t,
							onToggle: () => {
								if (group.expanded) setSessionLimits((limits) => ({
									...limits,
									[group.key]: COLLAPSED_SESSION_LIMIT
								}));
								setGroupExpanded(group.key, !group.expanded);
							},
							onCreate: () => {
								if (group.workspaceId !== void 0) {
									setGroupExpanded(group.key, true);
									startSession(group.workspaceId);
								}
							},
							drag: workspaceDragProps,
							actions: group.workspaceId === void 0 ? void 0 : {
								rename: () => {
									/* v8 ignore next -- narrowing guard: the actions object exists only for real-workspace groups. */
									if (group.workspaceId !== void 0) onRenameRequest(group.workspaceId, group.label);
								},
								delete: () => {
									/* v8 ignore next -- narrowing guard: the actions object exists only for real-workspace groups. */
									if (group.workspaceId !== void 0) onDeleteRequest(group.workspaceId, group.label);
								},
								setColor: (color) => {
									/* v8 ignore next -- narrowing guard: the actions object exists only for real-workspace groups. */
									if (group.workspaceId !== void 0) setWorkspaceColor(group.workspaceId, color);
								},
								togglePin: () => {
									/* v8 ignore next -- narrowing guard: the actions object exists only for real-workspace groups. */
									if (group.workspaceId !== void 0) setWorkspacePinned(group.workspaceId, workspacePinned[group.workspaceId] !== true);
								}
							}
						}),
						childRows.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							role: "group",
							children: childRows
						}),
						sessions.map((node) => {
							const sameGroupDrag = drag !== null && drag.accountKey === group.key;
							const compatibleTarget = sameGroupDrag && drag.pinned === node.pinned;
							const normalizeHalf = (half) => node.blank ? "after" : half;
							const dragProps = {
								start: () => {
									sessionDropCommitted.current = false;
									setDrag({
										accountKey: group.key,
										sessionId: node.id,
										pinned: node.pinned,
										over: null
									});
								},
								active: compatibleTarget,
								marker: sameGroupDrag && drag.over?.id === node.id ? drag.over.half : null,
								hover: (half) => {
									/* v8 ignore next -- narrowing guard: Rows gates hover on `active`, which is false while the drag state is null. */
									setDrag((d) => d === null ? d : {
										...d,
										over: {
											id: node.id,
											half: normalizeHalf(half)
										}
									});
								},
								drop: (half) => {
									/* v8 ignore next -- narrowing guard: Rows gates drop on `active`, which is false while the drag state is null. */
									if (drag === null) return;
									commitSessionDrag(drag, {
										id: node.id,
										half: normalizeHalf(half)
									});
								},
								end: () => {
									if (drag?.over !== null && drag?.over !== void 0) commitSessionDrag(drag, drag.over);
									else setDrag(null);
									sessionDropCommitted.current = false;
								}
							};
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionNodeItem, {
								node,
								currentId: current,
								now,
								onOpen: open,
								onRenameRequest: onSessionRenameRequest,
								renderSlot,
								onReveal: node.id === revealSessionId && group.key === revealGroup ? () => {
									onSessionRevealed(node.id);
								} : void 0,
								drag: dragProps,
								t
							}, node.id);
						}),
						collapsed.hiddenCount > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: WorkspaceBrowser_module_css_default.sessionOverflowButton,
							"data-row-key": `overflow:${group.key}`,
							"aria-expanded": sessionsExpanded,
							onClick: () => {
								setSessionLimits((limits) => ({
									...limits,
									[group.key]: toggledSessionLimit(group.sessions, limits[group.key])
								}));
							},
							children: sessionsExpanded ? t("sessions.collapse") : t("sessions.expand", { n: visible.hiddenCount })
						})
					]
				}, group.key);
			};
			const toggleGroup = (group) => {
				if (group.expanded) setSessionLimits((limits) => ({
					...limits,
					[group.key]: COLLAPSED_SESSION_LIMIT
				}));
				setGroupExpanded(group.key, !group.expanded);
			};
			const newSessionInGroup = (group) => {
				if (group.workspaceId === void 0) return;
				setGroupExpanded(group.key, true);
				startSession(group.workspaceId);
			};
			if (presentation === "cards") {
				const cardSeat = {
					currentId: current,
					now,
					onOpen: open,
					theme: themeSeat,
					renderSlot,
					t
				};
				const folderSeat = {
					home,
					newShortcut: shortcuts.find((row) => row.id === "session.new"),
					pinned: workspacePinned,
					setPinned: setWorkspacePinned,
					color: workspaceColor,
					setColor: setWorkspaceColor,
					onRename: onRenameRequest,
					onDelete: onDeleteRequest,
					onToggleGroup: toggleGroup,
					onNewSession: newSessionInGroup,
					onToggleOverflow: (groupKey) => {
						setSessionLimits((limits) => ({
							...limits,
							[groupKey]: toggledSessionLimit(groups.find((candidate) => candidate.key === groupKey)?.sessions ?? [], limits[groupKey])
						}));
					}
				};
				const foldedGroups = groups.map((group) => {
					const collapsed = collapsedSessionRows(group.sessions);
					const visible = collapsedSessionRows(group.sessions, sessionLimits[group.key]);
					return {
						group,
						sessions: visible.rows,
						foldedCount: collapsed.hiddenCount,
						hiddenCount: visible.hiddenCount
					};
				});
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: clsx(WorkspaceBrowser_module_css_default.treeBody, WorkspaceBrowser_module_css_default.wide),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: WorkspaceBrowser_module_css_default.list,
						children: [groups.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptySessions, {
							rowState,
							onLeaveArchivedOnly,
							t
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CardGroups, {
							foldedGroups,
							seat: cardSeat,
							folders: folderSeat,
							themes: themeGroups
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: WorkspaceBrowser_module_css_default.fade })]
				});
			}
			const groupRows = rootGroups.map((group) => renderGroup(group, 0));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(WorkspaceBrowser_module_css_default.treeBody, WorkspaceBrowser_module_css_default.wide),
				children: [
					workspaceDropAtListStart && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: WorkspaceBrowser_module_css_default.listTopDropIndicator,
						"aria-hidden": "true"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(AnimatedRows, {
						className: clsx(WorkspaceBrowser_module_css_default.list, workspaceDropAtListStart && WorkspaceBrowser_module_css_default.listTopDropActive),
						label: t("section.sessions"),
						rowKeys,
						ready: list.phase === "ready" && workspaceReady && !nativeDragActive,
						resetKey: JSON.stringify([animationResetKey, sessionLimits]),
						children: [groups.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptySessions, {
							rowState,
							onLeaveArchivedOnly,
							t
						}), groupRows]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: WorkspaceBrowser_module_css_default.fade })
				]
			});
		}
		/** The flat "In one list" body: every session is one draggable top-level row. */
		function FlatList({ list, sessionIds, rowState, onLeaveArchivedOnly, useSessionStatus, open, onSessionRenameRequest, usePanelInfo, setSessionOrder, workspaceReady, animationResetKey, revealSessionId, onSessionRevealed, renderSlot, t }) {
			const panelActive = usePanelInfo((info) => info.activePanelId !== null);
			const statuses = useSessionStatus((s) => s);
			const rows = (0, react.useMemo)(() => deriveFlat(list, sessionIds, rowState, statuses), [
				list,
				sessionIds,
				rowState,
				statuses
			]);
			const [drag, setDrag] = (0, react.useState)(null);
			const dropCommitted = (0, react.useRef)(false);
			useNativeDragAcceptance(drag !== null);
			const currentId = panelActive ? void 0 : Object.values(list.byId).find((session) => (session.retainedBy.mainView ?? 0) > 0)?.id;
			const commitDrag = (activeDrag, over) => {
				if (dropCommitted.current) return;
				dropCommitted.current = true;
				setDrag(null);
				const nextOrder = sessionDragOrder(sessionIds, rows, activeDrag, over);
				if (nextOrder !== void 0) setSessionOrder(FLAT_SESSION_ORDER_KEY, nextOrder);
			};
			const now = Date.now();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(WorkspaceBrowser_module_css_default.treeBody, WorkspaceBrowser_module_css_default.wide),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(AnimatedRows, {
					className: clsx(WorkspaceBrowser_module_css_default.list, WorkspaceBrowser_module_css_default.flatList),
					label: t("section.sessions"),
					rowKeys: rows.length === 0 ? ["empty"] : rows.map((row) => `session:${row.id}`),
					ready: list.phase === "ready" && workspaceReady && drag === null,
					resetKey: animationResetKey,
					children: [rows.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptySessions, {
						rowState,
						onLeaveArchivedOnly,
						t
					}), rows.map((node) => {
						const active = drag !== null && drag.pinned === node.pinned;
						const normalizeHalf = (half) => node.blank ? "after" : half;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionNodeItem, {
							node,
							currentId,
							now,
							onOpen: open,
							onRenameRequest: onSessionRenameRequest,
							renderSlot,
							onReveal: node.id === revealSessionId ? () => {
								onSessionRevealed(node.id);
							} : void 0,
							drag: {
								start: () => {
									dropCommitted.current = false;
									setDrag({
										accountKey: FLAT_SESSION_ORDER_KEY,
										sessionId: node.id,
										pinned: node.pinned,
										over: null
									});
								},
								active,
								marker: active && drag.over?.id === node.id ? drag.over.half : null,
								hover: (half) => {
									setDrag((current) => current === null ? current : {
										...current,
										over: {
											id: node.id,
											half: normalizeHalf(half)
										}
									});
								},
								drop: (half) => {
									if (drag !== null) commitDrag(drag, {
										id: node.id,
										half: normalizeHalf(half)
									});
								},
								end: () => {
									if (drag?.over !== null && drag?.over !== void 0) commitDrag(drag, drag.over);
									else setDrag(null);
									dropCommitted.current = false;
								}
							},
							t
						}, node.id);
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: WorkspaceBrowser_module_css_default.fade })]
			});
		}
		/** Flat search body: local metadata matches plus the current Host result page. */
		function SearchResults({ useSessions, useSessionStatus, open, onUnarchive, workspaces, archivedSessionIds, archivedFilter, query, remote, resultLimit, usePanelInfo, t }) {
			const panelActive = usePanelInfo((info) => info.activePanelId !== null);
			const list = useSessions((s) => s);
			const statuses = useSessionStatus((s) => s);
			const currentRemote = remote.query === query ? remote : {
				query,
				status: "loading",
				items: [],
				hasMore: false
			};
			const results = (0, react.useMemo)(() => deriveSearchResults(list, workspaces, query, archivedSessionIds, archivedFilter, statuses, currentRemote, resultLimit), [
				list,
				workspaces,
				query,
				archivedSessionIds,
				archivedFilter,
				statuses,
				currentRemote,
				resultLimit
			]);
			const pending = currentRemote.status === "loading";
			const currentId = panelActive ? void 0 : Object.values(list.byId).find((session) => (session.retainedBy.mainView ?? 0) > 0)?.id;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(WorkspaceBrowser_module_css_default.treeBody, WorkspaceBrowser_module_css_default.wide),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: WorkspaceBrowser_module_css_default.list,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: WorkspaceBrowser_module_css_default.searchTree,
							role: "tree",
							"aria-label": t("search.results.aria"),
							children: results.items.map((result) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearchResultItem, {
								result,
								currentId,
								onOpen: open,
								onUnarchive,
								t
							}, result.id))
						}),
						pending && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							role: "status",
							"aria-label": t("search.pending"),
							children: (results.items.length === 0 ? [0, 1] : [0]).map((i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: WorkspaceBrowser_module_css_default.skeletonRow,
								"aria-hidden": "true",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: WorkspaceBrowser_module_css_default.skeletonDot }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: WorkspaceBrowser_module_css_default.skeletonBars,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: WorkspaceBrowser_module_css_default.skeletonBar }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: clsx(WorkspaceBrowser_module_css_default.skeletonBar, WorkspaceBrowser_module_css_default.skeletonBarWide) })]
								})]
							}, i))
						}),
						!pending && results.items.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: WorkspaceBrowser_module_css_default.empty,
							children: t("search.noMatches")
						}),
						results.hasMore && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: WorkspaceBrowser_module_css_default.searchStatus,
							children: t("search.hasMore", { n: resultLimit })
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: WorkspaceBrowser_module_css_default.fade })]
			});
		}
		/**
		* Render the browsing region.
		* @param props - composed slot props (shell owner share + store + injected actions).
		* @returns the region element tree.
		*/
		function WorkspaceBrowser({ wide, usePanelInfo, expandSidebar, useSessions, useSessionStatus, useWorkspaces, useStore, actions, startSession, open, requestSessionRename, notifyArchivedNotOpenable, renameWorkspace, deleteWorkspace, insertWorkspaceBefore, unarchiveSession, createWorkspace, searchSessions, searchResultLimit, useDirectoryFlow, useHostInfo, useShortcuts, useWorkspaceShortcuts, requestSearch, requestAddWorkspace, closeAddWorkspace, setDirectoryBusy, dismissForkError, renderSlot, t }) {
			const home = useHostInfo((info) => info.home);
			const shortcuts = useShortcuts((rows) => rows);
			const searchShortcut = shortcuts.find((row) => row.id === "session.search");
			const addShortcut = shortcuts.find((row) => row.id === "workspace.add");
			const shortcutState = useWorkspaceShortcuts((state) => state);
			const list = useSessions((state) => state);
			const storedWorkspaces = useWorkspaces((state) => state.items);
			const defaultWorkspaceName = t("workspace.defaultName");
			const workspaces = (0, react.useMemo)(() => storedWorkspaces.map((workspace) => ({
				...workspace,
				title: workspaceDisplayTitle(workspace.title, defaultWorkspaceName)
			})), [storedWorkspaces, defaultWorkspaceName]);
			const workspacePhase = useWorkspaces((state) => state.phase);
			const workspaceStreamState = useWorkspaces((state) => state.state);
			const archivedSessionIds = useWorkspaces((state) => state.archivedSessionIds);
			const pinnedSessionIds = useWorkspaces((state) => state.pinnedSessionIds);
			const directoryFlowAvailable = useDirectoryFlow((occupied) => occupied);
			const groupBy = useStore((s) => s.groupBy);
			const orderBy = useStore((s) => s.orderBy);
			const archivedFilter = useStore((s) => s.archivedFilter ?? "default");
			const groupExpansion = useStore((s) => s.groupExpansion);
			const sessionOrderByAccount = useStore((s) => s.sessionOrderByAccount);
			const workspaceColor = useStore((s) => s.workspaceColor) ?? {};
			const workspacePinned = useStore((s) => s.workspacePinned) ?? {};
			const themes = useStore((s) => s.themes);
			const sessionTheme = useStore((s) => s.sessionTheme);
			const [themeTarget, setThemeTarget] = (0, react.useState)(null);
			const [themeDraft, setThemeDraft] = (0, react.useState)("");
			const themeAccountBySession = (0, react.useMemo)(() => {
				const bySession = /* @__PURE__ */ new Map();
				for (const workspace of workspaces) for (const sessionId of workspace.sessionIds) if (!bySession.has(sessionId)) bySession.set(sessionId, workspace.workspaceId);
				return bySession;
			}, [workspaces]);
			const themeAccountOf = (sessionId) => themeAccountBySession.get(sessionId) ?? "";
			const themeSeat = {
				assigned: sessionTheme,
				accountOf: themeAccountOf,
				themesOf: (sessionId) => themes[themeAccountOf(sessionId)] ?? [],
				assign: (sessionId, themeId) => {
					actions.assignSessionTheme(sessionId, themeId);
				},
				create: (accountKey) => {
					setThemeTarget({
						mode: "create",
						accountKey
					});
					setThemeDraft("");
				}
			};
			const themeGroups = {
				byAccount: themes,
				assigned: sessionTheme,
				onRename: (accountKey, theme) => {
					setThemeTarget({
						mode: "rename",
						accountKey,
						themeId: theme.id
					});
					setThemeDraft(theme.name);
				},
				onDelete: (accountKey, themeId) => {
					actions.deleteTheme(accountKey, themeId);
				}
			};
			const guardedOpen = (sessionId) => {
				if (archivedSessionIds.includes(sessionId)) {
					notifyArchivedNotOpenable();
					return;
				}
				open(sessionId);
			};
			const leaveArchivedOnly = () => {
				actions.setArchivedFilter("default");
			};
			const workspaceReady = workspacePhase === "ready" && workspaceStreamState !== "loading";
			const mainSessionId = Object.values(list.byId).find((session) => (session.retainedBy.mainView ?? 0) > 0)?.id;
			const currentBlank = mainSessionId !== void 0 && list.byId[mainSessionId]?.blank === true ? mainSessionId : void 0;
			const ungroupedMemberIds = (0, react.useMemo)(() => {
				const accounted = new Set(workspaces.flatMap((workspace) => workspace.sessionIds));
				return list.ids.filter((id) => list.byId[id] !== void 0 && !accounted.has(id));
			}, [list, workspaces]);
			const orderState = (0, react.useMemo)(() => ({
				pinnedSessionIds,
				archivedSessionIds
			}), [archivedSessionIds, pinnedSessionIds]);
			const rowState = (0, react.useMemo)(() => ({
				...orderState,
				archivedFilter
			}), [orderState, archivedFilter]);
			const flatMemberIds = (0, react.useMemo)(() => sessionMemberIds(list), [list]);
			const orderedWorkspaces = (0, react.useMemo)(() => [...workspaces].sort((left, right) => Number(workspacePinned[right.workspaceId] === true) - Number(workspacePinned[left.workspaceId] === true)).map((workspace) => {
				const memberIds = workspace.sessionIds;
				const baseOrder = orderBy === "updated" ? orderByRecency(memberIds, list.byId) : reconcileManualOrder(memberIds, sessionOrderByAccount[workspace.workspaceId], list.byId, orderState);
				return {
					...workspace,
					sessionIds: pinCurrentBlank(baseOrder, currentBlank !== void 0 && memberIds.includes(currentBlank) ? currentBlank : void 0)
				};
			}), [
				currentBlank,
				list.byId,
				orderBy,
				orderState,
				sessionOrderByAccount,
				workspacePinned,
				workspaces
			]);
			const orderedUngroupedSessionIds = (0, react.useMemo)(() => {
				return pinCurrentBlank(orderBy === "updated" ? orderByRecency(ungroupedMemberIds, list.byId) : reconcileManualOrder(ungroupedMemberIds, sessionOrderByAccount[""], list.byId, orderState), currentBlank !== void 0 && ungroupedMemberIds.includes(currentBlank) ? currentBlank : void 0);
			}, [
				currentBlank,
				list.byId,
				orderBy,
				orderState,
				sessionOrderByAccount,
				ungroupedMemberIds
			]);
			const orderedFlatSessionIds = (0, react.useMemo)(() => {
				return pinCurrentBlank(orderBy === "updated" ? orderByRecency(flatMemberIds, list.byId) : reconcileManualOrder(flatMemberIds, sessionOrderByAccount[FLAT_SESSION_ORDER_KEY], list.byId, orderState), currentBlank !== void 0 && flatMemberIds.includes(currentBlank) ? currentBlank : void 0);
			}, [
				currentBlank,
				flatMemberIds,
				list.byId,
				orderBy,
				orderState,
				sessionOrderByAccount
			]);
			const activeSessionOrders = (0, react.useMemo)(() => Object.fromEntries([
				...orderedWorkspaces.map((workspace) => [workspace.workspaceId, workspace.sessionIds]),
				["", orderedUngroupedSessionIds],
				[FLAT_SESSION_ORDER_KEY, orderedFlatSessionIds]
			]), [
				orderedFlatSessionIds,
				orderedUngroupedSessionIds,
				orderedWorkspaces
			]);
			(0, react.useEffect)(() => {
				if (workspacePhase !== "ready") return;
				actions.retainAccountKeys([
					"",
					FLAT_SESSION_ORDER_KEY,
					...workspaces.map((workspace) => workspace.workspaceId)
				]);
			}, [
				actions.retainAccountKeys,
				workspacePhase,
				workspaces
			]);
			(0, react.useEffect)(() => {
				if (list.phase !== "ready" || workspaceReady || orderBy !== "manual" || currentBlank === void 0) return;
				const changed = {};
				for (const [key, ids] of Object.entries(activeSessionOrders)) {
					if (key !== "__flat_session_order__" && workspacePhase !== "ready") continue;
					const saved = sessionOrderByAccount[key] ?? [];
					if (ids[0] !== currentBlank || saved[0] === currentBlank) continue;
					changed[key] = [currentBlank, ...saved.filter((id) => id !== currentBlank)];
				}
				if (Object.keys(changed).length > 0) actions.syncSessionOrders(changed);
			}, [
				actions.syncSessionOrders,
				activeSessionOrders,
				currentBlank,
				list.phase,
				orderBy,
				sessionOrderByAccount,
				workspacePhase,
				workspaceReady
			]);
			(0, react.useEffect)(() => {
				if (list.phase !== "ready" || !workspaceReady || orderBy !== "manual" || currentBlank === void 0) return;
				if (Object.entries(activeSessionOrders).some(([key, ids]) => ids[0] === currentBlank && sessionOrderByAccount[key]?.[0] !== currentBlank)) actions.syncSessionOrders(activeSessionOrders);
			}, [
				actions.syncSessionOrders,
				activeSessionOrders,
				currentBlank,
				list.phase,
				orderBy,
				sessionOrderByAccount,
				workspaceReady
			]);
			const saveSessionOrder = (accountKey, order) => {
				actions.setSessionOrder(accountKey, order, activeSessionOrders);
			};
			const [query, setQuery] = (0, react.useState)("");
			const [searchExpanded, setSearchExpanded] = (0, react.useState)(false);
			const [revealSessionId, setRevealSessionId] = (0, react.useState)(void 0);
			const normalizedQuery = sanitizeSearchQuery(query).trim();
			const [remoteSearch, setRemoteSearch] = (0, react.useState)({
				query: "",
				status: "idle",
				items: [],
				hasMore: false
			});
			const searchRoot = (0, react.useRef)(null);
			const searchInput = (0, react.useRef)(null);
			const wsPickerOpen = shortcutState.addRequested;
			const wsPlusRef = (0, react.useRef)(null);
			const composingRef = (0, react.useRef)(false);
			const openSearchResult = (sessionId) => {
				if (archivedSessionIds.includes(sessionId)) {
					notifyArchivedNotOpenable();
					return;
				}
				setRevealSessionId(sessionId);
				setQuery("");
				setSearchExpanded(false);
				open(sessionId);
			};
			const acknowledgeSessionReveal = (sessionId) => {
				setRevealSessionId((current) => current === sessionId ? void 0 : current);
			};
			(0, react.useEffect)(() => {
				if (normalizedQuery !== "") setRevealSessionId(void 0);
			}, [normalizedQuery]);
			const [searchOnExpand, setSearchOnExpand] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (wide && searchOnExpand) {
					const timer = window.setTimeout(() => {
						searchInput.current?.focus({ preventScroll: true });
						setSearchOnExpand(false);
					}, EXPAND_SLIDE_MS);
					return () => {
						window.clearTimeout(timer);
					};
				}
			}, [wide, searchOnExpand]);
			(0, react.useEffect)(() => {
				if (shortcutState.searchRequest === 0) return;
				closeAddWorkspace();
				setSearchExpanded(true);
				if (!wide) {
					setSearchOnExpand(true);
					expandSidebar();
				} else searchInput.current?.focus({ preventScroll: true });
			}, [shortcutState.searchRequest]);
			(0, react.useEffect)(() => {
				if (!wide || !searchExpanded || searchOnExpand) return;
				searchInput.current?.focus({ preventScroll: true });
			}, [
				wide,
				searchExpanded,
				searchOnExpand
			]);
			(0, react.useEffect)(() => {
				if (!wide || !searchExpanded || searchOnExpand) return;
				const onClick = (event) => {
					if (!(event.target instanceof Node) || searchRoot.current?.contains(event.target) === true) return;
					searchInput.current?.blur();
					if (normalizedQuery !== "") return;
					setSearchExpanded(false);
				};
				document.addEventListener("click", onClick);
				return () => {
					document.removeEventListener("click", onClick);
				};
			}, [
				normalizedQuery,
				wide,
				searchExpanded,
				searchOnExpand
			]);
			(0, react.useEffect)(() => {
				if (normalizedQuery === "") {
					setRemoteSearch({
						query: "",
						status: "idle",
						items: [],
						hasMore: false
					});
					return;
				}
				const controller = new AbortController();
				setRemoteSearch({
					query: normalizedQuery,
					status: "loading",
					items: [],
					hasMore: false
				});
				const timer = window.setTimeout(() => {
					searchSessions(normalizedQuery, controller.signal).then((result) => {
						if (controller.signal.aborted) return;
						setRemoteSearch({
							query: normalizedQuery,
							status: "ready",
							items: result.items,
							hasMore: result.hasMore
						});
					}).catch(() => {
						if (controller.signal.aborted) return;
						setRemoteSearch({
							query: normalizedQuery,
							status: "error",
							items: [],
							hasMore: false
						});
					});
				}, SEARCH_DEBOUNCE_MS);
				return () => {
					window.clearTimeout(timer);
					controller.abort();
				};
			}, [normalizedQuery, searchSessions]);
			const [renameTarget, setRenameTarget] = (0, react.useState)(null);
			const [renameDraft, setRenameDraft] = (0, react.useState)("");
			const [renaming, setRenaming] = (0, react.useState)(false);
			const [renameError, setRenameError] = (0, react.useState)(null);
			const renameTrimmed = renameDraft.trim();
			const renameDuplicate = renameTarget !== null && renameTrimmed !== "" && workspaces.some((w) => w.workspaceId !== renameTarget.workspaceId && w.title === renameTrimmed);
			const renameBlocked = renaming || renameTrimmed === "" || renameTarget === null || renameTrimmed === renameTarget.storedTitle || renameDuplicate;
			const closeRename = () => {
				if (renaming) return;
				setRenameTarget(null);
				setRenameError(null);
			};
			const confirmRename = () => {
				if (renameBlocked) return;
				setRenaming(true);
				setRenameError(null);
				renameWorkspace(renameTarget.workspaceId, renameTrimmed).then(() => {
					setRenaming(false);
					setRenameTarget(null);
				}).catch((reason) => {
					setRenaming(false);
					setRenameError(reason instanceof Error ? reason.message : String(reason));
				});
			};
			const onSessionUnarchive = (sessionId) => {
				unarchiveSession(sessionId).catch((reason) => {
					console.warn("session unarchive rejected:", reason);
				});
			};
			const themeTrimmed = themeDraft.trim();
			const themeConflict = themeTarget !== null && themeNameTaken(themes[themeTarget.accountKey] ?? [], themeTrimmed, themeTarget.mode === "rename" ? themeTarget.themeId : void 0);
			const themeBlocked = themeTarget === null || themeTrimmed === "" || themeConflict;
			const closeTheme = () => {
				setThemeTarget(null);
			};
			const confirmTheme = () => {
				/* v8 ignore next -- the Modal is absent without a target and its button is disabled while blocked. */
				if (themeBlocked || themeTarget === null) return;
				if (themeTarget.mode === "create") actions.createTheme(themeTarget.accountKey, themeTrimmed);
				else actions.renameTheme(themeTarget.accountKey, themeTarget.themeId, themeTrimmed);
				setThemeTarget(null);
			};
			const [deleteTarget, setDeleteTarget] = (0, react.useState)(null);
			const [deleting, setDeleting] = (0, react.useState)(false);
			const [deleteCommittedId, setDeleteCommittedId] = (0, react.useState)(null);
			const [deleteError, setDeleteError] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				if (deleteCommittedId === null || workspaces.some((workspace) => workspace.workspaceId === deleteCommittedId)) return;
				setDeleting(false);
				setDeleteCommittedId(null);
				setDeleteTarget(null);
			}, [deleteCommittedId, workspaces]);
			const closeDelete = () => {
				if (deleting) return;
				setDeleteTarget(null);
				setDeleteError(null);
			};
			const confirmDelete = () => {
				/* v8 ignore next -- the Modal is absent without a target and its button is disabled while deleting. */
				if (deleting || deleteTarget === null) return;
				setDeleting(true);
				setDeleteCommittedId(null);
				setDeleteError(null);
				deleteWorkspace(deleteTarget.workspaceId).then(() => {
					setDeleteCommittedId(deleteTarget.workspaceId);
				}).catch((reason) => {
					setDeleting(false);
					setDeleteError(reason instanceof Error ? reason.message : String(reason));
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(WorkspaceBrowser_module_css_default.root, !wide && WorkspaceBrowser_module_css_default.rail),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: WorkspaceBrowser_module_css_default.sectionHeader,
						children: [
							wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: clsx(WorkspaceBrowser_module_css_default.sectionLabel, WorkspaceBrowser_module_css_default.wide, searchExpanded && WorkspaceBrowser_module_css_default.sectionLabelHidden),
								children: groupBy === "flat" ? t("section.sessions") : t("section.workspaces")
							}),
							wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: clsx(WorkspaceBrowser_module_css_default.searchSlot, searchExpanded && WorkspaceBrowser_module_css_default.searchSlotExpanded),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									ref: searchRoot,
									className: clsx(WorkspaceBrowser_module_css_default.search, searchExpanded && WorkspaceBrowser_module_css_default.searchExpanded),
									onClick: () => {
										closeAddWorkspace();
										setSearchExpanded(true);
										searchInput.current?.focus();
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
											label: t("search"),
											shortcutKeys: searchShortcut?.keys,
											side: "bottom",
											delayMs: 500,
											disabled: searchExpanded,
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: WorkspaceBrowser_module_css_default.searchButton,
												"aria-label": t("search.sessions.aria"),
												"aria-keyshortcuts": searchShortcut?.aria,
												"aria-expanded": searchExpanded,
												onClick: () => {
													requestSearch();
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutlineRegular, { size: searchExpanded ? 11 : 14 })
											})
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											ref: searchInput,
											className: WorkspaceBrowser_module_css_default.searchInput,
											type: "text",
											placeholder: t("search.placeholder"),
											maxLength: SEARCH_QUERY_MAX_CODE_UNITS,
											value: query,
											tabIndex: searchExpanded ? 0 : -1,
											onChange: (e) => {
												setQuery(sanitizeSearchQuery(e.target.value));
											},
											onKeyDown: (e) => {
												if (e.key !== "Escape") return;
												setQuery("");
												setSearchExpanded(false);
											}
										}),
										searchExpanded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: WorkspaceBrowser_module_css_default.clearButton,
											"aria-label": t("search.clear"),
											onClick: (e) => {
												e.stopPropagation();
												setQuery("");
												setSearchExpanded(false);
											},
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseFillRegular, {})
										})
									]
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: clsx(WorkspaceBrowser_module_css_default.headerActions, wide && searchExpanded && WorkspaceBrowser_module_css_default.headerActionsHidden),
								children: [wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ViewOptionsMenu, {
									groupBy,
									orderBy,
									archivedFilter,
									onGroupPick: actions.setGroupBy,
									onOrderPick: (mode) => {
										actions.setOrderBy(mode, activeSessionOrders);
									},
									onArchivedFilterPick: actions.setArchivedFilter,
									t
								}), directoryFlowAvailable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
									label: t("workspace.add"),
									shortcutKeys: addShortcut?.keys,
									side: "bottom",
									delayMs: 500,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										ref: wsPlusRef,
										type: "button",
										className: WorkspaceBrowser_module_css_default.iconButton,
										"aria-label": t("workspace.add"),
										"aria-keyshortcuts": addShortcut?.aria,
										onClick: () => {
											requestAddWorkspace();
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconProjectAddOutlineRegular, { size: wide ? 16 : 18 })
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(WorkspacePickFlow, {
								t,
								open: wsPickerOpen,
								anchorRef: wsPlusRef,
								useWorkspaces,
								createWorkspace,
								useDirectoryFlow,
								renderDirectoryFlow: (owner) => renderSlot("sidebar.workspaces.directoryFlow", owner),
								addOnly: true,
								onBusyChange: setDirectoryBusy,
								side: "right",
								onPick: (workspaceId) => {
									closeAddWorkspace();
									startSession(workspaceId);
								},
								onClose: () => {
									closeAddWorkspace();
								}
							})
						]
					}),
					!wide && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: WorkspaceBrowser_module_css_default.search,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
							label: t("search"),
							shortcutKeys: searchShortcut?.keys,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: WorkspaceBrowser_module_css_default.searchButton,
								"aria-label": t("search.sessions.aria"),
								"aria-keyshortcuts": searchShortcut?.aria,
								onClick: () => {
									requestSearch();
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutlineRegular, { size: 18 })
							})
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: WorkspaceBrowser_module_css_default.listArea,
						children: wide && (normalizedQuery !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearchResults, {
							usePanelInfo,
							useSessions,
							useSessionStatus,
							open: openSearchResult,
							onUnarchive: onSessionUnarchive,
							workspaces,
							archivedSessionIds,
							archivedFilter,
							query: normalizedQuery,
							remote: remoteSearch,
							resultLimit: searchResultLimit,
							t
						}) : groupBy === "flat" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FlatList, {
							usePanelInfo,
							list,
							sessionIds: orderedFlatSessionIds,
							rowState,
							onLeaveArchivedOnly: leaveArchivedOnly,
							workspaceReady,
							animationResetKey: `${groupBy}/${orderBy}/${archivedFilter}`,
							useSessionStatus,
							open: guardedOpen,
							onSessionRenameRequest: requestSessionRename,
							renderSlot,
							setSessionOrder: saveSessionOrder,
							revealSessionId,
							onSessionRevealed: acknowledgeSessionReveal,
							t
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SessionTree, {
							usePanelInfo,
							list,
							shortcuts,
							useSessionStatus,
							onSessionRenameRequest: requestSessionRename,
							renderSlot,
							workspaces: orderedWorkspaces,
							ungroupedSessionIds: orderedUngroupedSessionIds,
							workspaceReady,
							nestWorkspaces: groupBy === "workspace-tree",
							presentation: groupBy === "cards" ? "cards" : "rows",
							animationResetKey: `${groupBy}/${orderBy}/${archivedFilter}`,
							groupExpansion,
							setGroupExpanded: actions.setGroupExpanded,
							workspaceColor,
							setWorkspaceColor: actions.setWorkspaceColor,
							workspacePinned,
							setWorkspacePinned: actions.setWorkspacePinned,
							setSessionOrder: saveSessionOrder,
							rowState,
							onLeaveArchivedOnly: leaveArchivedOnly,
							startSession,
							open: guardedOpen,
							insertWorkspaceBefore,
							revealSessionId,
							onSessionRevealed: acknowledgeSessionReveal,
							home,
							t,
							themeSeat,
							themeGroups,
							onRenameRequest: (workspaceId, displayTitle) => {
								setRenameTarget({
									workspaceId,
									storedTitle: storedWorkspaces.find((w) => w.workspaceId === workspaceId)?.title ?? displayTitle
								});
								setRenameDraft(displayTitle);
								setRenameError(null);
							},
							onDeleteRequest: (workspaceId, title) => {
								setDeleteTarget({
									workspaceId,
									title
								});
								setDeleteError(null);
							}
						}))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: renameTarget !== null,
						onClose: closeRename,
						closeLabel: t("close"),
						title: t("rename.workspace.title"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							disabled: renaming,
							onClick: closeRename,
							children: t("cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							disabled: renameBlocked,
							onClick: confirmRename,
							children: t("rename")
						})] }),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: WorkspaceBrowser_module_css_default.renameInput,
								value: renameDraft,
								"aria-label": t("field.workspaceName"),
								"data-modal-autofocus": true,
								disabled: renaming,
								onFocus: (e) => {
									e.target.select();
								},
								onChange: (e) => {
									setRenameDraft(e.target.value);
									setRenameError(null);
								},
								onCompositionStart: () => {
									composingRef.current = true;
								},
								onCompositionEnd: () => {
									composingRef.current = false;
								},
								onKeyDown: (e) => {
									if (e.key === "Enter" && !composingRef.current) {
										e.preventDefault();
										confirmRename();
									}
								}
							}),
							renameDuplicate && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: WorkspaceBrowser_module_css_default.renameError,
								role: "alert",
								children: t("conflict.named", { name: renameTrimmed })
							}),
							renameError !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: WorkspaceBrowser_module_css_default.renameError,
								role: "alert",
								children: renameError
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: themeTarget !== null,
						onClose: closeTheme,
						closeLabel: t("close"),
						title: themeTarget?.mode === "rename" ? t("theme.rename.title") : t("theme.create.title"),
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							onClick: closeTheme,
							children: t("cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							disabled: themeBlocked,
							onClick: confirmTheme,
							children: themeTarget?.mode === "rename" ? t("theme.rename") : t("theme.create.title")
						})] }),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: WorkspaceBrowser_module_css_default.renameInput,
								value: themeDraft,
								"aria-label": t("theme.field.name"),
								"data-modal-autofocus": true,
								onFocus: (e) => {
									e.target.select();
								},
								onChange: (e) => {
									setThemeDraft(e.target.value);
								},
								onCompositionStart: () => {
									composingRef.current = true;
								},
								onCompositionEnd: () => {
									composingRef.current = false;
								},
								onKeyDown: (e) => {
									if (e.key !== "Enter" || composingRef.current) return;
									e.preventDefault();
									confirmTheme();
								}
							}),
							themeTarget !== null && themeDraft !== "" && themeTrimmed === "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: WorkspaceBrowser_module_css_default.renameError,
								role: "alert",
								children: t("theme.empty")
							}),
							themeConflict && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: WorkspaceBrowser_module_css_default.renameError,
								role: "alert",
								children: t("theme.conflict", { name: themeTrimmed })
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
						open: deleteTarget !== null,
						onClose: closeDelete,
						closeLabel: t("close"),
						title: t("delete.workspace"),
						...deleteTarget === null ? {} : { description: t("delete.desc", { name: deleteTarget.title }) },
						footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							disabled: deleting,
							onClick: closeDelete,
							children: t("cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							className: WorkspaceBrowser_module_css_default.deleteAction,
							disabled: deleting,
							onClick: confirmDelete,
							children: t("delete.workspace")
						})] }),
						children: [deleting && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: WorkspaceBrowser_module_css_default.deleteStatus,
							role: "status",
							children: t("delete.pending")
						}), deleteError !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: WorkspaceBrowser_module_css_default.renameError,
							role: "alert",
							children: deleteError
						})]
					}),
					shortcutState.forkError !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
						text: t(shortcutState.forkError.reason === "unavailable" ? "shortcut.noCompletedTurn" : "shortcut.forkFailed"),
						onDone: dismissForkError
					}, shortcutState.forkError.seq)
				]
			});
		}
		//#endregion
		//#region src/client/session-actions/ArchiveSession.tsx
		/**
		* The archive action: a `sidebar.workspaces.session.menu.item` row and a
		* `sidebar.workspaces.session.row.action` button over one injected behavior,
		* plus the `shell.overlay` dialog that confirms stopping a Session's running
		* work before archiving it. The same entries restore an archived row; the
		* notice a successful archive raises and the diagnostics for Host rejections
		* live in the injected callbacks, not here.
		*/
		/**
		* Menu row (order 400): archive, or restore an archived row.
		* @param props - owner share, the archive share, and the menu open state.
		* @returns the row.
		*/
		function ArchiveSessionMenuItem({ sessionId, useArchived, useMenuOpenState, useShortcuts, archiveSession, unarchiveSession, t }) {
			const [, setMenuOpen] = useMenuOpenState();
			const shortcut = useShortcuts((rows) => rows.find((row) => row.id === "session.archive"));
			const archived = useArchived((set) => set.has(sessionId));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MenuItemButton, {
				shortcut: archived ? void 0 : shortcut,
				icon: archived ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconUnarchiveOutlineRegular, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconArchiveOutlineRegular, { size: 14 }),
				onSelect: () => {
					setMenuOpen(false);
					(archived ? unarchiveSession : archiveSession)(sessionId);
				},
				children: t(archived ? "menu.unarchiveSession" : "menu.archiveSession")
			});
		}
		/**
		* Hover button (order 100): archive, or restore an archived row.
		* @param props - owner share and the archive share.
		* @returns the button.
		*/
		function ArchiveSessionRowButton({ sessionId, useArchived, archiveSession, unarchiveSession, t }) {
			const archived = useArchived((set) => set.has(sessionId));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: t(archived ? "actions.unarchive" : "actions.archive"),
				side: "bottom",
				align: "end",
				delayMs: 500,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: Rows_module_css_default.iconButton,
					"aria-label": t(archived ? "menu.unarchiveSession" : "menu.archiveSession"),
					onClick: () => {
						(archived ? unarchiveSession : archiveSession)(sessionId);
					},
					children: archived ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconUnarchiveOutlineRegular, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconArchiveOutlineRegular, { size: 14 })
				})
			});
		}
		/**
		* The `shell.overlay` entry: nothing while no confirmation is pending,
		* otherwise one dialog per request (keyed by the Session). Confirming asks
		* the Host to stop the listed work and archive; cancelling leaves the
		* Session running and visible.
		* @param props - the request hook, its settlement, the stop-and-archive hop, and the locale seat.
		* @returns the open dialog, or null.
		*/
		function SessionArchiveConfirmDialog({ useArchiveRequest, settleSessionArchive, stopAndArchiveSession, t }) {
			const request = useArchiveRequest((pending) => pending);
			if (request === null) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ArchiveConfirmForm, {
				request,
				stopAndArchiveSession,
				onSettle: settleSessionArchive,
				t
			}, request.sessionId);
		}
		/** One request's dialog: in-flight and error state die with it. */
		function ArchiveConfirmForm({ request, stopAndArchiveSession, onSettle, t }) {
			const [archiving, setArchiving] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const close = () => {
				if (archiving) return;
				onSettle();
			};
			const confirm = () => {
				setArchiving(true);
				setError(null);
				stopAndArchiveSession(request.sessionId).then(() => {
					setArchiving(false);
					onSettle();
				}).catch((reason) => {
					setArchiving(false);
					setError(reason instanceof Error ? reason.message : String(reason));
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose: close,
				closeLabel: t("close"),
				title: t("archive.confirm.title"),
				description: t("archive.confirm.desc", { title: request.displayTitle }),
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					disabled: archiving,
					onClick: close,
					children: t("cancel")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					className: WorkspaceBrowser_module_css_default.deleteAction,
					disabled: archiving,
					onClick: confirm,
					children: t("archive.confirm.action")
				})] }),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: WorkspaceBrowser_module_css_default.archiveActivity,
						"aria-label": t("archive.confirm.activity"),
						children: request.activity.map((entry, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: activityLine(entry, t) }, `${entry.kind}-${String(index)}`))
					}),
					archiving && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: WorkspaceBrowser_module_css_default.deleteStatus,
						role: "status",
						children: t("archive.confirm.pending")
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: WorkspaceBrowser_module_css_default.renameError,
						role: "alert",
						children: error
					})
				]
			});
		}
		/**
		* One family's line: its count and the items' labels (ids when a family
		* carries no label). A family this dictionary does not know — a provider
		* merged into the kind map — falls through to the generic line.
		*/
		function activityLine(entry, t) {
			const items = entry.items ?? [];
			const n = items.length;
			const names = items.map((item) => item.label ?? item.id).join(t("archive.confirm.listSeparator"));
			const plural = n === 1 ? "one" : "other";
			switch (entry.kind) {
				case "turn": return t("archive.confirm.turn");
				case "subagent": return t(`archive.confirm.subagents.${plural}`, {
					n,
					names
				});
				case "job": return t(`archive.confirm.jobs.${plural}`, {
					n,
					names
				});
				case "schedule": return t(`archive.confirm.schedules.${plural}`, {
					n,
					names
				});
				default: return t(`archive.confirm.other.${plural}`, {
					kind: entry.kind,
					n
				});
			}
		}
		//#endregion
		//#region src/client/session-actions/derived.ts
		/**
		* Project one observable into another, recomputing only when the source
		* snapshot changes identity, so consumers that select from the projection
		* (a Set lookup per row) never rebuild it per read.
		* @param source - the observable to project.
		* @param project - pure projection of one source snapshot.
		* @returns the projected observable, subscribing through the source.
		*/
		function derive(source, project) {
			let seen;
			let value;
			return {
				getSnapshot: () => {
					const snapshot = source.getSnapshot();
					if (value === void 0 || snapshot !== seen) {
						seen = snapshot;
						value = project(snapshot);
					}
					return value;
				},
				subscribe: (listener) => source.subscribe(listener)
			};
		}
		//#endregion
		//#region src/client/session-actions/ForkSession.tsx
		/** The fork action: one `sidebar.workspaces.session.menu.item` row. */
		/**
		* Menu row (order 300): fork at the Session's last completed turn; the child
		* arrives through the Host list beside its source.
		* @param props - owner share, menu open state, and the fork share.
		* @returns the row.
		*/
		function ForkSessionMenuItem({ sessionId, useMenuOpenState, useShortcuts, forkSession, t }) {
			const [, setMenuOpen] = useMenuOpenState();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MenuItemButton, {
				shortcut: useShortcuts((rows) => rows.find((row) => row.id === "session.fork")),
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutlineRegular, {}),
				onSelect: () => {
					setMenuOpen(false);
					forkSession(sessionId);
				},
				children: t("menu.fork")
			});
		}
		//#endregion
		//#region src/client/session-actions/PinSession.tsx
		/**
		* The pin action: a `sidebar.workspaces.session.menu.item` row and a
		* `sidebar.workspaces.session.row.action` button over one injected behavior.
		* Pin and archive are mutually exclusive on the Host, so the action reads both
		* sets and does not offer itself on an archived row; what a pin does beyond
		* the Host call (fronting the Session in its saved orders, the failure
		* notice) lives in the injected callbacks, not here.
		*/
		/** The row's pin and archive membership, one Set lookup each. */
		function usePinState({ sessionId, usePinned, useArchived }) {
			return {
				pinned: usePinned((pinned) => pinned.has(sessionId)),
				archived: useArchived((archived) => archived.has(sessionId))
			};
		}
		/**
		* Menu row (order 100): pin or unpin by the row's current state; absent on archived rows.
		* @param props - owner share, the pin share, and the menu open state.
		* @returns the row, or null for an archived Session.
		*/
		function PinSessionMenuItem(props) {
			const { sessionId, useMenuOpenState, pinSession, unpinSession, t } = props;
			const [, setMenuOpen] = useMenuOpenState();
			const { pinned, archived } = usePinState(props);
			if (archived) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MenuItemButton, {
				icon: pinned ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPinFillRegular, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPinOutlineRegular, {}),
				onSelect: () => {
					setMenuOpen(false);
					(pinned ? unpinSession : pinSession)(sessionId);
				},
				children: t(pinned ? "menu.unpinSession" : "menu.pinSession")
			});
		}
		/**
		* Hover button (order 200, rightmost: it lands where the rest-state pin marker sits); absent on archived rows.
		* @param props - owner share and the pin share.
		* @returns the button, or null for an archived Session.
		*/
		function PinSessionRowButton(props) {
			const { sessionId, pinSession, unpinSession, t } = props;
			const { pinned, archived } = usePinState(props);
			if (archived) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
				label: t(pinned ? "actions.unpin" : "actions.pin"),
				side: "bottom",
				align: "end",
				delayMs: 500,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: Rows_module_css_default.iconButton,
					"aria-label": t(pinned ? "menu.unpinSession" : "menu.pinSession"),
					onClick: () => {
						(pinned ? unpinSession : pinSession)(sessionId);
					},
					children: pinned ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPinFillRegular, { size: 14 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPinOutlineRegular, { size: 14 })
				})
			});
		}
		//#endregion
		//#region src/client/session-actions/RenameSession.tsx
		/**
		* The rename action: a `sidebar.workspaces.session.menu.item` row that raises
		* the rename request, and the `shell.overlay` dialog entry that answers it.
		* The dialog lives outside the row menu because the row unmounts with the
		* menu; the browser raises the same request from a title double-click.
		*/
		/**
		* Menu row (order 200): ask for the rename dialog, seeded with the row's current title.
		* @param props - owner share, menu open state, and the rename share.
		* @returns the row.
		*/
		function RenameSessionMenuItem({ sessionId, displayTitle, useMenuOpenState, useShortcuts, requestSessionRename, t }) {
			const [, setMenuOpen] = useMenuOpenState();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.MenuItemButton, {
				shortcut: useShortcuts((rows) => rows.find((row) => row.id === "session.rename")),
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutlineRegular, {}),
				onSelect: () => {
					setMenuOpen(false);
					requestSessionRename(sessionId, displayTitle);
				},
				children: t("rename")
			});
		}
		/**
		* The `shell.overlay` entry: nothing while no rename is requested, otherwise
		* one dialog per request (keyed by the Session, so a new request starts a
		* fresh draft). Sessions have no client-side name-conflict rule (the host
		* normalizes), and unlike Workspace rename an unchanged title is NOT
		* blocked. An unnamed Session starts with an empty draft and requires a name.
		* @param props - the request hook, its settlement, the rename hop, and the locale seat.
		* @returns the open dialog, or null.
		*/
		function SessionRenameDialog({ useRenameRequest, settleSessionRename, renameSession, t }) {
			const request = useRenameRequest((pending) => pending);
			if (request === null) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RenameForm, {
				request,
				renameSession,
				onSettle: settleSessionRename,
				t
			}, request.sessionId);
		}
		/** One request's dialog: the draft seeds from the request on mount; in-flight and error state die with it. */
		function RenameForm({ request, renameSession, onSettle, t }) {
			const [draft, setDraft] = (0, react.useState)(request.currentTitle);
			const [renaming, setRenaming] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const composingRef = (0, react.useRef)(false);
			const trimmed = draft.trim();
			const blocked = renaming || trimmed === "";
			const close = () => {
				if (renaming) return;
				onSettle();
			};
			const confirm = () => {
				if (blocked) return;
				setRenaming(true);
				setError(null);
				renameSession(request.sessionId, trimmed).then(() => {
					setRenaming(false);
					onSettle();
				}).catch((reason) => {
					setRenaming(false);
					setError(reason instanceof Error ? reason.message : String(reason));
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose: close,
				closeLabel: t("close"),
				title: t("rename.session.title"),
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					disabled: renaming,
					onClick: close,
					children: t("cancel")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: blocked,
					onClick: confirm,
					children: t("rename")
				})] }),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					className: WorkspaceBrowser_module_css_default.renameInput,
					value: draft,
					"aria-label": t("field.sessionName"),
					"data-modal-autofocus": true,
					disabled: renaming,
					onFocus: (e) => {
						e.target.select();
					},
					onChange: (e) => {
						setDraft(e.target.value);
						setError(null);
					},
					onCompositionStart: () => {
						composingRef.current = true;
					},
					onCompositionEnd: () => {
						composingRef.current = false;
					},
					onKeyDown: (e) => {
						if (e.key === "Enter" && !composingRef.current) {
							e.preventDefault();
							confirm();
						}
					}
				}), error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: WorkspaceBrowser_module_css_default.renameError,
					role: "alert",
					children: error
				})]
			});
		}
		//#endregion
		//#region src/client/session-actions/RowActionToast.tsx
		/**
		* The `shell.overlay` entry for Workspace and Session notices.
		* One notice is visible at a time; a parent rerender does not extend its hold.
		*/
		/**
		* Hold for the notices that take longer to read than a one-line warning: the
		* actionable archived notice (two buttons to react to) and a refused Session
		* creation, which quotes the Host's reason.
		*/
		const LONG_TOAST_HOLD_MS = 6e3;
		/**
		* Render the current notice: the archived and stopped-and-archived notices
		* with their undo action — plus the show-archived action while archived rows
		* are hidden — on a 6 s hold, a refused Session creation with the Host's
		* reason on the same hold, or a plain warning for a failed pin, an archived
		* row that was clicked, or default Workspace creation.
		* @param props - the notice hook, the shared viewing store, the notice dismissal, the two archived-notice actions, and the locale seat.
		* @returns the notice on display, or null.
		*/
		function RowActionToast({ useToast, useStore, dismissToast, undoArchive, showArchived, t }) {
			const toast = useToast((current) => current);
			const archivedRowsVisible = useStore((state) => (state.archivedFilter ?? "default") !== "default");
			if (toast === null) return null;
			if (toast.kind === "archived" || toast.kind === "stoppedAndArchived") {
				const { sessionId } = toast;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
					text: t(toast.kind === "archived" ? "toast.archived" : "toast.stoppedAndArchived"),
					tone: "success",
					holdMs: LONG_TOAST_HOLD_MS,
					actions: [{
						label: t("toast.archivedUndo"),
						onClick: () => {
							dismissToast();
							undoArchive(sessionId);
						}
					}, ...archivedRowsVisible ? [] : [{
						prefix: t("toast.archivedOr"),
						label: t("toast.archivedFilter"),
						onClick: () => {
							dismissToast();
							showArchived();
						}
					}]],
					onDone: dismissToast
				}, `toast-${String(toast.seq)}`);
			}
			if (toast.kind === "createFailed") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
				text: t("toast.createFailed", { message: toast.message }),
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutlineRegular, {}),
				holdMs: LONG_TOAST_HOLD_MS,
				onDone: dismissToast
			}, `toast-${String(toast.seq)}`);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
				text: plainNoticeText(toast, t),
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutlineRegular, {}),
				onDone: dismissToast
			}, `toast-${String(toast.seq)}`);
		}
		/** The copy of one plain warning, keyed by the notice kind the union closes over. */
		function plainNoticeText(toast, t) {
			switch (toast.kind) {
				case "pinFailed": return t("toast.pinFailed");
				case "unpinFailed": return t("toast.unpinFailed");
				case "defaultWorkspaceFailed": return t("defaultWorkspace.failed");
				case "archivedNotOpenable": return t("toast.archivedNotOpenable");
				/* v8 ignore next 2 -- closed-union backstop; only reached if a notice kind is forged */
				default: return assertNever$1(toast);
			}
		}
		//#endregion
		//#region src/client/locales.ts
		/**
		* `workspace` namespace dictionaries: the browsing region (section header,
		* search, tree rows, dialogs) and the pick/add flow. Runtime failure
		* messages (wire error strings) pass through untranslated by policy.
		*/
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"defaultWorkspace.failed": "无法创建默认工作区，请通过“选择工作区”选择文件夹",
			"group.ungrouped": "未分组",
			"session.new": "新会话",
			"session.untitled": "未命名",
			"shortcut.noSession": "请先选择一个会话",
			"shortcut.noPicker": "目录选择器不可用",
			"shortcut.directoryBusy": "正在选择或添加工作区",
			"shortcut.noCompletedTurn": "当前会话没有已结束的轮次",
			"shortcut.forkFailed": "无法分叉会话，请重试",
			"section.workspaces": "工作区",
			"section.sessions": "会话",
			"viewOptions.label": "视图选项",
			"groupBy.label": "分组方式",
			"groupBy.workspace": "按工作区",
			"groupBy.workspaceTree": "按工作区树",
			"groupBy.flat": "单列表",
			"groupBy.cards": "卡片视图",
			"orderBy.label": "排序方式",
			"orderBy.manual": "手动排序",
			"orderBy.updated": "最近更新",
			"filterBy.label": "筛选会话",
			"viewOptions.hideArchived": "隐藏已归档",
			"viewOptions.showArchived": "全部对话（显示已归档）",
			"viewOptions.onlyArchived": "仅显示已归档",
			"sessions.expand": "展开其余 {n} 个会话",
			"sessions.collapse": "收起",
			"empty.none": "暂无会话",
			"empty.noneArchived": "暂无已归档会话",
			"empty.viewOthers": "查看其他会话",
			"empty.noMatches": "无匹配结果",
			"workspace.add": "添加工作区",
			"search.sessions.aria": "搜索会话",
			"search.placeholder": "搜索会话名称",
			"search.clear": "清除搜索",
			"search.results.aria": "搜索结果",
			"search.pending": "正在搜索会话历史…",
			"search.noMatches": "无匹配会话",
			"search.hasMore": "仅显示前 {n} 条结果，请缩小搜索范围。",
			"menu.addWorkspace": "添加工作区…",
			"picker.loading": "正在加载工作区…",
			"conflict.named": "已存在名为“{name}”的工作区。",
			"folderError.title": "无法打开文件夹",
			"folderError.retry": "重新选择",
			"rename": "重命名",
			"rename.workspace.title": "重命名工作区",
			"rename.session.title": "重命名会话",
			"field.workspaceName": "工作区名称",
			"field.sessionName": "会话名称",
			"menu.color": "设置项目文件夹颜色",
			"color.default": "默认颜色",
			"color.red": "红色",
			"color.orange": "橙色",
			"color.yellow": "黄色",
			"color.green": "绿色",
			"color.cyan": "青色",
			"color.blue": "蓝色",
			"color.purple": "紫色",
			"color.pink": "粉色",
			"delete.workspace": "删除工作区",
			"delete.desc": "将把“{name}”从工作区列表中移除。文件夹与会话记录会保留，其会话将显示在“未分组”下。",
			"delete.pending": "正在删除工作区…",
			"menu.fork": "分叉会话",
			"menu.archiveSession": "归档会话",
			"menu.unarchiveSession": "取消归档",
			"menu.pinSession": "置顶会话",
			"menu.unpinSession": "取消置顶",
			"menu.pin": "置顶项目",
			"menu.unpin": "取消置顶",
			"row.archived": "已归档",
			"row.pinned": "已置顶",
			"toast.archivedNotOpenable": "已归档对话暂时无法查看，请取消归档后查看",
			"toast.archived": "会话已归档，可",
			"toast.stoppedAndArchived": "已停止并归档，可",
			"archive.confirm.title": "停止并归档此会话？",
			"archive.confirm.desc": "“{title}”仍有正在进行的工作。归档会先停止这些工作；之后可在侧栏筛选“全部对话（显示已归档）”中恢复会话，被停止的工作不会自动继续。",
			"archive.confirm.activity": "将被停止的工作",
			"archive.confirm.turn": "进行中的回合",
			"archive.confirm.subagents.one": "{n} 个运行中的子智能体：{names}",
			"archive.confirm.subagents.other": "{n} 个运行中的子智能体：{names}",
			"archive.confirm.jobs.one": "{n} 个后台任务：{names}",
			"archive.confirm.jobs.other": "{n} 个后台任务：{names}",
			"archive.confirm.schedules.one": "{n} 条定时提醒：{names}",
			"archive.confirm.schedules.other": "{n} 条定时提醒：{names}",
			"archive.confirm.other.one": "{n} 项其他工作（{kind}）",
			"archive.confirm.other.other": "{n} 项其他工作（{kind}）",
			"archive.confirm.listSeparator": "、",
			"archive.confirm.action": "停止并归档",
			"archive.confirm.pending": "正在停止并归档…",
			"toast.archivedUndo": "撤销",
			"toast.archivedOr": "或",
			"toast.archivedFilter": "筛选已归档会话",
			"toast.pinFailed": "置顶失败，请稍后重试",
			"toast.unpinFailed": "取消置顶失败，请稍后重试",
			"toast.createFailed": "新建会话失败：{message}",
			"sessions.count.one": "{n} 个会话",
			"sessions.count.other": "{n} 个会话",
			"actions.workspace.aria": "工作区“{name}”的操作",
			"actions.session.aria": "会话“{name}”的操作",
			"actions.archive": "归档会话",
			"actions.unarchive": "取消归档",
			"actions.pin": "置顶会话",
			"actions.unpin": "取消置顶",
			"actions.newSession": "新会话",
			"actions.newSession.aria": "在“{name}”中新建会话",
			"status.running": "进行中",
			"status.subagentsRunning.one": "{n} 个子智能体运行中",
			"status.subagentsRunning.other": "{n} 个子智能体运行中",
			"status.idle": "空闲",
			"status.waitingApproval": "等待审批",
			"status.planReview": "计划待审",
			"status.waitingAnswer": "等待回答",
			"status.compact.approval": "待审批",
			"status.compact.planReview": "计划待审",
			"status.compact.answer": "待回答",
			"status.completed": "已完成",
			"hover.created": "创建于 {time}",
			"hover.copied": "已复制",
			"date.ymd": "{y}年{m}月{d}日",
			"time.now": "刚刚",
			"time.minutes": "{n}分钟",
			"time.hours": "{n}小时",
			"time.days": "{n}天",
			"time.months": "{n}个月",
			"time.years": "{n}年",
			"time.ago": "{t}前",
			"theme.none": "无主题",
			"theme.menu.label": "主题",
			"theme.create": "新建主题…",
			"theme.create.title": "新建主题",
			"theme.rename": "重命名主题",
			"theme.rename.title": "重命名主题",
			"theme.delete": "删除主题",
			"theme.field.name": "主题名称",
			"theme.empty": "主题名称不能为空。",
			"theme.conflict": "该项目下已存在主题“{name}”。",
			"theme.group.aria": "{group} · {theme}",
			"theme.actions.aria": "主题“{name}”的操作",
			"theme.card.aria": "会话“{name}”的主题"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"defaultWorkspace.failed": "Unable to create default workspace. Use Choose workspace to select a folder.",
			"group.ungrouped": "Ungrouped",
			"session.new": "New Session",
			"session.untitled": "Untitled",
			"shortcut.noSession": "Select a session first",
			"shortcut.noPicker": "Directory picker unavailable",
			"shortcut.directoryBusy": "Selecting or adding a workspace",
			"shortcut.noCompletedTurn": "This session has no completed turn",
			"shortcut.forkFailed": "Could not fork the session. Try again.",
			"section.workspaces": "Workspaces",
			"section.sessions": "Sessions",
			"viewOptions.label": "View options",
			"groupBy.label": "Group by",
			"groupBy.workspace": "WorkSpace",
			"groupBy.workspaceTree": "Workspace Tree",
			"groupBy.flat": "In one list",
			"groupBy.cards": "Cards",
			"orderBy.label": "Order by",
			"orderBy.manual": "Manual",
			"orderBy.updated": "Last updated",
			"filterBy.label": "Filter sessions",
			"viewOptions.hideArchived": "Hide archived",
			"viewOptions.showArchived": "All conversations (show archived)",
			"viewOptions.onlyArchived": "Archived only",
			"sessions.expand": "Show {n} more sessions",
			"sessions.collapse": "Show less",
			"empty.none": "No sessions yet",
			"empty.noneArchived": "No archived sessions yet",
			"empty.viewOthers": "View other sessions",
			"empty.noMatches": "No matches",
			"workspace.add": "Add workspace",
			"search.sessions.aria": "Search sessions",
			"search.placeholder": "Search session names",
			"search.clear": "Clear search",
			"search.results.aria": "Search results",
			"search.pending": "Searching session history…",
			"search.noMatches": "No matching sessions",
			"search.hasMore": "Showing the first {n} results. Narrow your search.",
			"menu.addWorkspace": "Add workspace…",
			"picker.loading": "Loading workspaces…",
			"conflict.named": "A workspace named “{name}” already exists.",
			"folderError.title": "Couldn’t open folder",
			"folderError.retry": "Choose again",
			"rename": "Rename",
			"rename.workspace.title": "Rename workspace",
			"rename.session.title": "Rename session",
			"field.workspaceName": "Workspace name",
			"field.sessionName": "Session name",
			"menu.color": "Set project folder color",
			"color.default": "Default",
			"color.red": "Red",
			"color.orange": "Orange",
			"color.yellow": "Yellow",
			"color.green": "Green",
			"color.cyan": "Cyan",
			"color.blue": "Blue",
			"color.purple": "Purple",
			"color.pink": "Pink",
			"delete.workspace": "Delete workspace",
			"delete.desc": "This removes “{name}” from the workspace list. The folder and session logs will be kept. Its sessions will appear under Ungrouped.",
			"delete.pending": "Deleting workspace…",
			"menu.fork": "Fork session",
			"menu.archiveSession": "Archive session",
			"menu.unarchiveSession": "Unarchive session",
			"menu.pinSession": "Pin session",
			"menu.unpinSession": "Unpin session",
			"menu.pin": "Pin project",
			"menu.unpin": "Unpin project",
			"row.archived": "Archived",
			"row.pinned": "Pinned",
			"toast.archivedNotOpenable": "Archived sessions cannot be opened. Unarchive it to view.",
			"toast.archived": "Session archived. You can ",
			"toast.stoppedAndArchived": "Session stopped and archived. You can ",
			"archive.confirm.title": "Stop and archive this session?",
			"archive.confirm.desc": "“{title}” still has work in progress. Archiving stops it first; you can restore the session later from the “All conversations (show archived)” filter in the sidebar, and the stopped work will not resume on its own.",
			"archive.confirm.activity": "Work that will be stopped",
			"archive.confirm.turn": "The turn in progress",
			"archive.confirm.subagents.one": "{n} running subagent: {names}",
			"archive.confirm.subagents.other": "{n} running subagents: {names}",
			"archive.confirm.jobs.one": "{n} background job: {names}",
			"archive.confirm.jobs.other": "{n} background jobs: {names}",
			"archive.confirm.schedules.one": "{n} scheduled reminder: {names}",
			"archive.confirm.schedules.other": "{n} scheduled reminders: {names}",
			"archive.confirm.other.one": "{n} other item of work ({kind})",
			"archive.confirm.other.other": "{n} other items of work ({kind})",
			"archive.confirm.listSeparator": ", ",
			"archive.confirm.action": "Stop and archive",
			"archive.confirm.pending": "Stopping and archiving…",
			"toast.archivedUndo": "undo",
			"toast.archivedOr": " or ",
			"toast.archivedFilter": "filter archived sessions",
			"toast.pinFailed": "Pin failed. Try again later.",
			"toast.unpinFailed": "Unpin failed. Try again later.",
			"toast.createFailed": "New session failed: {message}",
			"sessions.count.one": "{n} session",
			"sessions.count.other": "{n} sessions",
			"actions.workspace.aria": "Workspace actions for {name}",
			"actions.session.aria": "Session actions for {name}",
			"actions.archive": "Archive",
			"actions.unarchive": "Unarchive",
			"actions.pin": "Pin",
			"actions.unpin": "Unpin",
			"actions.newSession": "New session",
			"actions.newSession.aria": "New session in {name}",
			"status.running": "Running",
			"status.subagentsRunning.one": "{n} subagent running",
			"status.subagentsRunning.other": "{n} subagents running",
			"status.idle": "Idle",
			"status.waitingApproval": "Waiting for approval",
			"status.planReview": "Plan awaiting review",
			"status.waitingAnswer": "Waiting for answer",
			"status.compact.approval": "Approval",
			"status.compact.planReview": "Plan review",
			"status.compact.answer": "Answer",
			"status.completed": "Completed",
			"hover.created": "Created {time}",
			"hover.copied": "Copied",
			"date.ymd": "{y}-{m}-{d}",
			"time.now": "now",
			"time.minutes": "{n}min",
			"time.hours": "{n}h",
			"time.days": "{n}d",
			"time.months": "{n}mo",
			"time.years": "{n}y",
			"time.ago": "{t} ago",
			"theme.none": "No theme",
			"theme.menu.label": "Theme",
			"theme.create": "New theme…",
			"theme.create.title": "New theme",
			"theme.rename": "Rename theme",
			"theme.rename.title": "Rename theme",
			"theme.delete": "Delete theme",
			"theme.field.name": "Theme name",
			"theme.empty": "A theme name is required.",
			"theme.conflict": "This project already has a theme named “{name}”.",
			"theme.group.aria": "{group} · {theme}",
			"theme.actions.aria": "Theme actions for {name}",
			"theme.card.aria": "Theme for session {name}"
		};
		//#endregion
		//#region src/client/index.ts
		/** Dictionary namespace owned by this plugin. */
		const NS = "workspace";
		/**
		* Required services (cordis fiber inject). The target slots are declared by
		* the ui-sidebar / ui-conversation applies, whose activation order relative
		* to this one is NOT constrained: dsh.client.inject edges are informational
		* (loading/prefetch metadata, never apply sequencing) and neither owner
		* provides a waitable service. apply therefore depends on each slot
		* declaration through `slots.inject()` instead of assuming order.
		*/
		const inject = [
			"slots",
			"sessions",
			"workspaces",
			"locale",
			"remote",
			"remote.directoryPicker",
			"layout",
			"shortcuts"
		];
		/**
		* Carry Workspace folder colors over from the pre-card persistence key. The
		* v6 key took over before the color feature existed, so colors the browser
		* wrote while v5 still held the state live only there; the one-shot marker
		* stops a color the user later clears from returning.
		* @param actions - the bound viewing-store actions.
		*/
		function carryLegacyWorkspaceColors(actions) {
			const marker = "dsh.workspace.view.v5.colors-carried";
			try {
				if (localStorage.getItem(marker) !== null) return;
				localStorage.setItem(marker, "1");
				const legacy = localStorage.getItem("dsh.workspace.view.v5");
				if (legacy === null) return;
				const stored = JSON.parse(legacy).workspaceColor;
				for (const [workspaceId, color] of Object.entries(stored ?? {})) actions.setWorkspaceColor(workspaceId, color);
			} catch {}
		}
		/**
		* Register the browser and picker once their slot declarations are on the
		* ledger. Inject factories return plain callbacks; data reads use the
		* framework's global hooks.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			const sessions = ctx.get("sessions");
			const workspaces = ctx.get("workspaces");
			const viewHandle = createWorkspaceViewStore();
			const viewInstance = viewHandle.create();
			carryLegacyWorkspaceColors(viewInstance.actions);
			const viewStore = {
				...viewHandle,
				create: () => viewInstance
			};
			const rowToast = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(null);
			let toastSeq = 0;
			const notify = (toast) => {
				rowToast.set({
					...toast,
					seq: ++toastSeq
				});
			};
			const uiWorkspace = new UiWorkspaceService(ctx, ctx.remote.directoryPicker, workspaces, sessions, viewInstance.actions, notify);
			ctx.slots.provideRoot({ hooks: { workspaces: workspaces.list } });
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-workspace: dictionaries");
			const shortcutControls = createWorkspaceShortcutControls();
			const searchSessions = async (query, signal) => {
				const result = await sessions.search(query, signal);
				if (!result.ok) throw new Error(result.error.message);
				return result.value;
			};
			const flowSource = (hole) => ({
				getSnapshot: () => ctx.slots.entries(hole).length > 0,
				subscribe: (listener) => ctx.slots.subscribe(hole, listener)
			});
			const browserFlowSource = flowSource("sidebar.workspaces.directoryFlow");
			const hostInfo = {
				getSnapshot: () => ctx.remote.$host,
				subscribe: (listener) => ctx.on("connection/reset", listener)
			};
			const pickerFlowSource = flowSource("conversation.hero.workspace.directoryFlow");
			const openSession = (sessionId) => {
				uiWorkspace.openSession(sessionId);
			};
			const pinnedSet = derive(workspaces.list, (snapshot) => new Set(snapshot.pinnedSessionIds));
			const archivedSet = derive(workspaces.list, (snapshot) => new Set(snapshot.archivedSessionIds));
			const renameRequest = derive(shortcutControls.state, (state) => state.renameTarget);
			const archiveRequest = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(null);
			const requestSessionRename = shortcutControls.rename;
			const unarchiveSession = (sessionId) => {
				uiWorkspace.unarchiveSession(sessionId).catch((reason) => {
					console.warn("session unarchive rejected:", reason);
				});
			};
			const renameSession = async (sessionId, title) => {
				const result = await sessions.using(sessionId, { source: "workspaceOperation" }, (reference) => reference.binding.session.rename(title));
				if (!result.ok) throw new Error(result.error.message);
			};
			const pinInjected = () => ({
				hooks: {
					pinned: pinnedSet,
					archived: archivedSet
				},
				pinSession: (sessionId) => {
					uiWorkspace.pinSession(sessionId).catch(() => {
						notify({ kind: "pinFailed" });
					});
				},
				unpinSession: (sessionId) => {
					uiWorkspace.unpinSession(sessionId).catch(() => {
						notify({ kind: "unpinFailed" });
					});
				}
			});
			const archiveInjected = () => ({
				hooks: { archived: archivedSet },
				archiveSession: (sessionId) => {
					uiWorkspace.archiveSession(sessionId).then(() => {
						notify({
							kind: "archived",
							sessionId
						});
					}).catch((reason) => {
						const activity = activeSessionRefusal(reason);
						if (activity === void 0) {
							console.warn("session archive rejected:", reason);
							return;
						}
						const displayTitle = sessions.list.getSnapshot().byId[sessionId]?.displayTitle ?? sessionId;
						archiveRequest.set({
							sessionId,
							displayTitle,
							activity
						});
					});
				},
				unarchiveSession
			});
			installWorkspaceShortcuts(ctx, uiWorkspace, shortcutControls, archiveInjected().archiveSession);
			const archiveConfirmInjected = () => ({
				hooks: { archiveRequest },
				settleSessionArchive: () => {
					archiveRequest.set(null);
				},
				stopAndArchiveSession: async (sessionId) => {
					await uiWorkspace.archiveSession(sessionId, { stopActivity: true });
					notify({
						kind: "stoppedAndArchived",
						sessionId
					});
				}
			});
			const forkInjected = () => ({ forkSession: (sessionId) => {
				uiWorkspace.forkSession(sessionId, (childId) => {
					ctx.get("productAnalytics")?.track("branch_session_click", {
						session_id: childId,
						parent_session_id: sessionId,
						click_position: "sidebar"
					});
				}).catch(() => {});
			} });
			const renameInjected = () => ({ requestSessionRename });
			const renameDialogInjected = () => ({
				hooks: { renameRequest },
				settleSessionRename: shortcutControls.closeRename,
				renameSession
			});
			const rowToastInjected = () => ({
				hooks: { toast: rowToast },
				dismissToast: () => {
					rowToast.set(null);
				},
				undoArchive: unarchiveSession,
				showArchived: () => {
					viewInstance.actions.setArchivedFilter("show");
				}
			});
			const browserInjected = () => ({
				startSession: (workspaceId) => {
					uiWorkspace.startSession(workspaceId);
				},
				open: openSession,
				searchSessions,
				searchResultLimit: sessions.searchResultLimit,
				requestSessionRename,
				notifyArchivedNotOpenable: () => {
					notify({ kind: "archivedNotOpenable" });
				},
				renameWorkspace: async (workspaceId, title) => {
					await workspaces.rename(workspaceId, title);
				},
				deleteWorkspace: async (workspaceId) => {
					await workspaces.delete(workspaceId);
				},
				insertWorkspaceBefore: async (workspaceId, beforeWorkspaceId) => {
					await workspaces.insertBefore(workspaceId, beforeWorkspaceId);
				},
				unarchiveSession: async (sessionId) => {
					await uiWorkspace.unarchiveSession(sessionId);
				},
				createWorkspace: (input) => workspaces.create(input),
				requestSearch: shortcutControls.search,
				requestAddWorkspace: shortcutControls.add,
				closeAddWorkspace: shortcutControls.closeAdd,
				setDirectoryBusy: shortcutControls.directoryBusy,
				dismissForkError: shortcutControls.dismissForkError,
				hooks: {
					directoryFlow: browserFlowSource,
					hostInfo,
					workspaceShortcuts: shortcutControls.state,
					shortcuts: ctx.shortcuts.catalog
				}
			});
			const pickerInjected = () => ({
				createWorkspace: (input) => workspaces.create(input),
				hooks: { directoryFlow: pickerFlowSource }
			});
			ctx.slots.inject("sidebar.workspaces", () => ctx.slots.register({
				name: "sidebar.workspaces",
				children: {
					"sidebar.workspaces.directoryFlow": {
						kind: "single",
						scope: "root"
					},
					"sidebar.workspaces.session.menu.item": {
						kind: "list",
						scope: "root",
						inject: { hooks: {
							menuOpenState: menuOpenStateFactory,
							shortcuts: ctx.shortcuts.catalog
						} }
					},
					"sidebar.workspaces.session.row.action": {
						kind: "list",
						scope: "root"
					},
					"sidebar.session.row.leading": {
						kind: "list",
						scope: "root"
					},
					"sidebar.session.row.hover": {
						kind: "list",
						scope: "root"
					}
				},
				store: viewStore,
				inject: browserInjected,
				locale: NS
			}, WorkspaceBrowser));
			ctx.slots.inject("sidebar.workspaces.session.menu.item", function* () {
				yield ctx.slots.register({
					name: "sidebar.workspaces.session.menu.item",
					id: "pin",
					order: 100,
					locale: NS,
					inject: pinInjected
				}, PinSessionMenuItem);
				yield ctx.slots.register({
					name: "sidebar.workspaces.session.menu.item",
					id: "rename",
					order: 200,
					locale: NS,
					inject: renameInjected
				}, RenameSessionMenuItem);
				yield ctx.slots.register({
					name: "sidebar.workspaces.session.menu.item",
					id: "fork",
					order: 300,
					locale: NS,
					inject: forkInjected
				}, ForkSessionMenuItem);
				yield ctx.slots.register({
					name: "sidebar.workspaces.session.menu.item",
					id: "archive",
					order: 400,
					locale: NS,
					inject: archiveInjected
				}, ArchiveSessionMenuItem);
			});
			ctx.slots.inject("sidebar.workspaces.session.row.action", function* () {
				yield ctx.slots.register({
					name: "sidebar.workspaces.session.row.action",
					id: "archive",
					order: 100,
					locale: NS,
					inject: archiveInjected
				}, ArchiveSessionRowButton);
				yield ctx.slots.register({
					name: "sidebar.workspaces.session.row.action",
					id: "pin",
					order: 200,
					locale: NS,
					inject: pinInjected
				}, PinSessionRowButton);
			});
			ctx.slots.inject("shell.overlay", function* () {
				yield ctx.slots.register({
					name: "shell.overlay",
					id: "workspace.session-rename",
					locale: NS,
					inject: renameDialogInjected
				}, SessionRenameDialog);
				yield ctx.slots.register({
					name: "shell.overlay",
					id: "workspace.session-archive",
					locale: NS,
					inject: archiveConfirmInjected
				}, SessionArchiveConfirmDialog);
				yield ctx.slots.register({
					name: "shell.overlay",
					id: "workspace.row-toast",
					locale: NS,
					store: viewStore,
					inject: rowToastInjected
				}, RowActionToast);
			});
			ctx.slots.inject("conversation.hero.workspace", () => ctx.slots.register({
				name: "conversation.hero.workspace",
				children: { "conversation.hero.workspace.directoryFlow": {
					kind: "single",
					scope: "root"
				} },
				inject: pickerInjected,
				locale: NS
			}, WorkspacePicker));
		}
		/**
		* The activity a Host `workspace/session-active` refusal reported, or nothing
		* for any other failure. The class identity check goes by name: client plugin
		* bundles do not share error-class identity.
		*/
		function activeSessionRefusal(reason) {
			if (!(reason instanceof Error) || reason.name !== "WorkspaceArchiveError") return void 0;
			const { rpcError } = reason;
			return rpcError.code === "workspace/session-active" ? rpcError.details.activity : void 0;
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map