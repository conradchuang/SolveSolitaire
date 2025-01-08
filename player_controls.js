// vim: set ai et sw=4 sts=4:

function PlayerControls (element_ids) {
    var buttons = {};
    var controller = null;
    var pause_playing = false;
    var play_timeout = null;

    async function cb_prev() {
        await controller.backward();
        update_state(controller.get_state());
    }

    async function cb_next() {
        await controller.forward();
        update_state(controller.get_state());
    }

    async function cb_play() {
        if (pause_playing) {
            pause_playing = false;
            update_state(controller.get_state());
        } else {
            await controller.forward();
            let state = controller.get_state();
            if (state.has_next) {
                play_timeout = setTimeout(cb_play, controller.pause_interval);
                buttons.next.disabled = true;
                buttons.prev.disabled = true;
                buttons.play.disabled = true;
                buttons.pause.disabled = false;
                buttons.restart.disabled = false;
            } else {
                play_timeout = null;
                update_state(state);
            }
        }
    }

    async function cb_pause() {
        if (play_timeout) {
            clearTimeout(play_timeout);
            play_timeout = null;
            pause_playing = true;
        }
        update_state(controller.get_state());
    }

    async function cb_restart() {
        if (play_timeout) {
            clearTimeout(play_timeout);
            play_timeout = null;
        }
        await controller.restart();
        update_state(controller.get_state());
    }

    function init() {
        buttons.prev = document.getElementById(element_ids.prev);
        buttons.prev.addEventListener("click", cb_prev);
        buttons.next = document.getElementById(element_ids.next);
        buttons.next.addEventListener("click", cb_next);
        buttons.play = document.getElementById(element_ids.play);
        buttons.play.addEventListener("click", cb_play);
        buttons.pause = document.getElementById(element_ids.pause);
        buttons.pause.addEventListener("click", cb_pause);
        buttons.restart = document.getElementById(element_ids.restart);
        buttons.restart.addEventListener("click", cb_restart);
        controller = null;
        update_state(null);
    }

    function update_state(state) {
        if (controller) {
            buttons.prev.disabled = !state.has_prev;
            buttons.next.disabled = !state.has_next;
            buttons.play.disabled = !state.has_next;
            buttons.pause.disabled = !play_timeout;
            buttons.restart.disabled = false;
        } else {
            buttons.prev.disabled = true;
            buttons.next.disabled = true;
            buttons.play.disabled = true;
            buttons.pause.disabled = true;
            buttons.restart.disabled = true;
        }
    }

    function set_controller(c) {
        controller = c;
        let state = c ? c.get_state() : null;
        update_state(state);
    }

    init();

    return {
        set_controller: set_controller,
    }
};
