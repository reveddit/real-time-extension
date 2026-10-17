-- Starts Firefox with its built-in remote-control port open on 127.0.0.1:9222
-- (WebDriver BiDi), so scripts/firefox-bidi.cjs can drive it. A running
-- Firefox ignores startup flags, so this asks you to quit it first.
-- Compile once and keep it in the Dock:
--   osacompile -o ~/Applications/"Firefox for Claude.app" scripts/firefox-for-claude.applescript
set ffRunning to do shell script "pgrep -x firefox >/dev/null && echo yes || echo no"
if ffRunning is "yes" then
	display dialog "Firefox is already running without the remote-control port. Quit Firefox (Cmd-Q), then open this again." buttons {"OK"} default button 1 with title "Firefox for Claude"
else
	do shell script "open -a Firefox --args --remote-debugging-port 9222"
end if
