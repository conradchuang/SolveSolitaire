// vim: set ai et sw=4 sts=4:

const SpiderNumCols = 10;
const InitialCardsPerCol = 13;
const NumCards = 52 * 2;
const InitialDeal = 54;
const StockSize = NumCards - InitialDeal;
const StockRow = -1;
const CompleteRow = -2;
const SpiderScale = 1;
const TimeoutInterval = 60000;           // Timeout in ms

const debugging = false;
const animate = false;

var RankAbove = {
    'ace': '2',
    '2': '3',
    '3': '4',
    '4': '5',
    '5': '6',
    '6': '7',
    '7': '8',
    '8': '9',
    '9': '10',
    '10': 'jack',
    'jack': 'queen',
    'queen': 'king',
    'king': 'none',
}
var SuitMap = { "S":"spades", "H":"hearts", "D":"diamonds", "C":"clubs" };
var RankMap = { "A":"ace", "K":"king", "Q":"queen", "J":"jack", "T":"10",
                "9":"9",   "8":"8",    "7":"7",     "6":"6",
                "5":"5",   "4":"4",    "3":"3",     "2":"2" };
function inverse_map(m) {
    let im = {};
    for (let k in m)
        im[m[k]] = k;
    return im;
}
var InvSuitMap = inverse_map(SuitMap);
var InvRankMap = inverse_map(RankMap);
var SuitCount = { "spades": 4, "hearts": 4 };

var assigned_positions = 0;
var player_controls = null;
var spider_div = null;
var column_card_height = new Array(SpiderNumCols);
var layout = {};
var complete_img = null;

//=============================================================================
// UI
//=============================================================================

function percent(fraction) {
    return (fraction * 100).toFixed(2) + "%";
}

function height_unit(card_heights) {
    return card_heights.toFixed(2) + CardHeightUnit;
}

function position_assign(img, rank, suit, key) {
    img.setAttribute("data-rank", rank);
    img.setAttribute("data-suit", suit);
    img.setAttribute("data-key", key);
    img.src = card_img_url(rank, suit);
    card_used(key, true);
    assigned_positions++;
    let disabled = assigned_positions != NumCards;
    document.getElementById("solve").disabled = disabled;
    // document.getElementById("solve2").disabled = disabled;
}

function position_cancel(img, rank, suit, key) {
    img.setAttribute("data-rank", "");
    img.setAttribute("data-suit", "");
    img.setAttribute("data-key", "");
    img.src = card_back_url();
    card_used(key, false);
    assigned_positions--
    let disabled = assigned_positions != NumCards;
    document.getElementById("solve").disabled = disabled;
    // document.getElementById("solve2").disabled = disabled;
}

function _cancel_handler(ev) {
    ev.preventDefault();
}

function _drop_handler(ev) {
    ev.preventDefault();
    let img = ev.target;
    let rank = ev.dataTransfer.getData("rank");
    let suit = ev.dataTransfer.getData("suit");
    let key = ev.dataTransfer.getData("key");
    let orig_rank = img.getAttribute("data-rank");
    if (orig_rank) {
        alert("Position is already assigned");
        return;
    }
    position_assign(img, rank, suit, key);
}

function _click_handler(ev) {
    ev.preventDefault();
    let img = ev.target;
    let rank = img.getAttribute("data-rank");
    if (!rank) {
        // Silently ignore request.  Alert was too irritating.
        // alert("Position is not assigned yet");
        return;
    }
    let suit = img.getAttribute("data-suit");
    let key = img.getAttribute("data-key");
    position_cancel(img, rank, suit, key);
}

function spider_gen() {
    // Vertically, the game is divided into two sections:
    // the board, and the stock pile + complete pile.
    // The sections are separate by "section_gap" card-heights;
    //
    // For the board, there are 10 columns with a total of 54
    // cards.  The first 4 columns have 6 cards and the last
    // 6 have 5.
    // The columns do not overlap and are separated by
    // "col_gap" card-width.  Cards in each column overlap by
    // "card_overlap" card-height.  While the initial board
    // has at most 6 cards, during play, there will
    // be more cards per column.  A priori, we allocate 13
    // cards per column, but that can be adjusted later
    // when the maximum number of cards in a column for an actual
    // solution is found.
    //
    // The stock pile takes most of the left portion of the second
    // section, while the complete pile takes one full card width.
    // For the stock pile, there are StockSize cards.  The
    // available space is evenly divided for the cards, so the
    // any overlap is the result of insufficient space to show
    // the full width of the cards.
    //
    // Note that the space for each card is not necessarily the same as the
    // width of the card image.  To compensate, we set the x position for
    // each card to the middle of the space and depend on CSS to translate
    // the card 50% to the left.  This places each card at the center of
    // its space and guarantees even spacing throughout.

    let div = document.createElement("div");
    div.id = "spider-div";
    div.classList.add("spider-div");
    let section_gap = 1 / 2;

    // For board
    let card_overlap = 1 / 4;
    let h_scale = ((InitialCardsPerCol * card_overlap) + 1);
    let board_height = (h_scale + section_gap) * CardHeight;
    let col_gap = 1 / 3;
    let card_width = SpiderScale / (SpiderNumCols * 1 +
                                     (SpiderNumCols - 1) * col_gap);
    let gap_width = col_gap * card_width;

    // For stock pile + complete pile
    let num_stock_rows = 2;
    let row_gap = 1 / 8;
    let stock_height = (num_stock_rows + (num_stock_rows - 1) * row_gap) *
                       CardHeight;

    // Then we combine them so percentages work right
    let div_height = board_height + stock_height;
    let card_height = 1 / h_scale * (board_height / div_height);
    for (let i = 0; i < column_card_height.length; i++)
        column_card_height[i] = card_height;

    // Save some sizing information for use solution playback
    layout.board_height = board_height;
    layout.stock_height = stock_height;
    layout.section_gap = section_gap;
    layout.col_gap = col_gap;
    layout.card_width = card_width;
    layout.gap_width = gap_width;
    layout.row_gap = row_gap;
    layout.vertical_overlap = card_overlap;

    // Finally, we add the cards
    add_board(div, card_width, gap_width, card_height, card_overlap,
              0, board_height);
    add_stock(div, StockSize, num_stock_rows, row_gap,
              board_height, stock_height);
    div.style.height = height_unit(div_height);

    return div;
}

function add_board(div, card_width, gap_width, card_height,
                   card_overlap, section_top, section_height) {
    let min_rows = Math.trunc(InitialDeal / SpiderNumCols);
    let extra_card = InitialDeal % SpiderNumCols;
    for (let col = 0; col < SpiderNumCols; col++) {
        let num_rows = min_rows;
        if (col < extra_card)
            num_rows++;
        let left = (1 - SpiderScale) / 2 + col * (card_width + gap_width) +
                   card_width / 2;
        for (let row = 0; row < num_rows; row++) {
            let img = document.createElement("img");
            img.draggable = false;
            img.setAttribute("data-col", col);
            img.setAttribute("data-row", row);
            img.setAttribute("data-rank", "");
            img.setAttribute("data-suit", "");
            img.classList.add("card-img");
            img.classList.add("spider-card");
            img.classList.add("spider-center");
            img.style.left = percent(left);
            let h = section_top + row * card_overlap * CardHeight;
            img.style.top = height_unit(h);
            img.style.zIndex = row;
            img.src = card_back_url();
            img.addEventListener("click", _click_handler);
            img.addEventListener("drop", _drop_handler);
            img.addEventListener("dragenter", _cancel_handler);
            img.addEventListener("dragover", _cancel_handler);
            div.appendChild(img);
        }
    }
}

function add_stock(div, num_cards, num_rows, row_gap,
                   section_top, section_height) {
    // Compute positioning parameters
    let cards_per_row = Math.trunc(num_cards / num_rows);
    // The cards overlap by a half card width, so there are a total
    // of N+1 half-card widths for the stock.  
    // The complete well is separated from the last card by a half-card
    // width and the wll itself is a full-card width, so an additional
    // 3 half-card widths are needed for the row.
    let card_width = 1 / (cards_per_row + 1 + 3);

    // Add stock cards
    let row = -1;
    for (let c = 0; c < num_cards; c++) {
        let offset = c % cards_per_row;
        if (offset == 0)
            row++;
        let img = document.createElement("img");
        img.draggable = false;
        img.setAttribute("data-row", StockRow);
        img.setAttribute("data-col", c);
        img.setAttribute("data-rank", "");
        img.setAttribute("data-suit", "");
        img.setAttribute("data-key", "");
        img.classList.add("card-img");
        img.classList.add("spider-card");
        img.classList.add("spider-center");
        let left = card_width * (offset + 1);
        img.style.left = percent(left);
        let yoffset = CardHeight * row * (1 + row_gap);
        img.style.top = height_unit(section_top + yoffset);
        img.src = card_back_url();
        img.addEventListener("click", _click_handler);
        img.addEventListener("drop", _drop_handler);
        img.addEventListener("dragenter", _cancel_handler);
        img.addEventListener("dragover", _cancel_handler);
        div.appendChild(img);
    }

    // Add the complete pile
    let img = document.createElement("img");
    img.draggable = false;
    img.setAttribute("data-row", CompleteRow);
    img.setAttribute("data-col", 0);
    img.setAttribute("data-rank", "");
    img.setAttribute("data-suit", "");
    img.setAttribute("data-key", "");
    img.classList.add("card-img");
    img.classList.add("cards-well");
    img.classList.add("spider-card");
    img.classList.add("spider-center");
    let left = card_width * (cards_per_row + 3);
    img.style.left = percent(left);
    // Place complete pile in vertical middle
    let yoffset = section_height / 2 - CardHeight / 2;
    img.style.top = height_unit(section_top + yoffset);
    img.src = card_well_url();
    img.addEventListener("click", _click_handler);
    img.addEventListener("drop", _drop_handler);
    img.addEventListener("dragenter", _cancel_handler);
    img.addEventListener("dragover", _cancel_handler);
    div.appendChild(img);
    complete_img = img;

    layout.stock_card_width = card_width;
    layout.stock_cards_per_row = cards_per_row;
}

function find_board_card(row, col) {
    let query = "img[data-col='" + col + "'][data-row='" + row + "']";
    let imgs = spider_div.querySelectorAll(query);
    return imgs[0];
}

function find_stock_card(index) {
    return find_board_card(StockRow, index);
}

function find_position(col, row) {
    if (row == CompleteRow)
        return complete_position();
    else if (row == StockRow)
        return stock_position(col);
    else
        return board_position(col, row);
}

function complete_position() {
    return { left: complete_img.style.left,
             top: complete_img.style.top };
}

function board_position(col, row) {
    let per_col_width = layout.card_width + layout.gap_width;
    let left = (1 - SpiderScale) / 2 + col * per_col_width +
               layout.card_width / 2;
    let t = row * layout.vertical_overlap * CardHeight;
    return { left: percent(left),
             top: height_unit(t) };
}

function stock_position(index) {
    let xoffset = index % layout.stock_cards_per_row
    let left = layout.stock_card_width * (xoffset + 1);
    let row = Math.trunc(index / layout.stock_cards_per_row)
    let yoffset = CardHeight * row * (1 + layout.row_gap);
    let t = yoffset + layout.board_height;
    return { left: percent(left),
             top: height_unit(t) };
}

function reset() {
    assigned_positions = 0;
    spider_div.innerHTML = "";
    spider_div.appendChild(spider_gen());
    let cards = document.getElementById("cards");
    cards.innerHTML = "";
    cards.appendChild(cards_table_gen());
    let disabled = assigned_positions != NumCards;
    document.getElementById("solve").disabled = disabled;
    // document.getElementById("solve2").disabled = disabled;
    player_controls.set_controller(null);
}

async function _solve_handler(ev) {
    try {
        await depth_first_search(performance.now() + TimeoutInterval);
    } catch (e) {
        alert(e);
    }
}

async function _solve2_handler(ev) {
    await breadth_first_search();
}

function _reset_handler(ev) {
    reset();
}

async function _test_handler(ev) {
    test_fill();
}

function init() {
    spider_div = document.getElementById("spider");
    player_controls = PlayerControls({prev:"s-c-prev",
                                      next:"s-c-next",
                                      play:"s-c-play",
                                      pause:"s-c-pause",
                                      restart:"s-c-restart"});
    cards_table_init(SuitCount);
    reset();
    document.getElementById("solve").addEventListener("click", _solve_handler);
    // document.getElementById("solve2").addEventListener("click", _solve2_handler);
    document.getElementById("reset").addEventListener("click", _reset_handler);
    document.getElementById("test").addEventListener("click", _test_handler);
}

window.addEventListener("load", init);

//=============================================================================
// Solver
//=============================================================================

// Rank-suit based keys for identifying equivalent cards

function suit_rank_fp(suit, rank) {
    return InvSuitMap[suit] + InvRankMap[rank];
}

function make_card(suit, rank, key, row, col, img) {
    // Note that the key and fingerprint are different.  For fingerprint,
    // identical rank+suit cards are interchangeable, but for uniqueness,
    // they are not.
    let card = { suit: suit,
                 rank: rank,
                 key: key,
                 row: row,
                 col: col,
                 is_red: suit === "hearts" || suit === "diamonds",
                 img: img,
                 fingerprint: suit_rank_fp(suit, rank),
                 left: img.style.left,
                 top: img.style.top };
    return card;
}

function make_state(complete, board, stock) {

    function fingerprint() {
        // To uniquely identify the state, we construct
        // a string that is the concatenation of the column
        // cards, the stock pile cards, and the complete pile cards
        let fp = [];
        for (let col = 0; col < SpiderNumCols; col++)
            fp.push(board[col].map(card => card.fingerprint).join(""))
        // Sort the columns because order does not matter
        // for finding a solution.  Stock cards do not need
        // to be sorted since they should always be in the
        // same order.  Complete pile cards do not be included
        // because order they are whatever is not on the board
        // or in the stock pile and order does not matter
        fp.sort();
        fp.push(stock.map(card => card.fingerprint).join(""));
        // fp.push(complete.map(card => card.fingerprint).join(""));
        return fp.join("/");
    }

    function copy() {
        // Make a copy of the board state without copying
        // the playing state variables
        // "board" needs to be copied per column (array)
        // "stock" needs to be copied (array)
        // "complete" needs to be copied (array)
        // The array copying can be shallow since the array elements are
        // cards, whose properties never change.
        let new_w = complete.slice();
        let new_b = new Array(board.length);
        for (let i = 0; i < new_b.length; i++)
            new_b[i] = board[i].slice();
        let new_s = stock.slice();
        return make_state(new_w, new_b, new_s);
    }

    function log() {
        console.log(this);
        function c2fp(card) { return card.fingerprint; }
        for (let col = 0; col < SpiderNumCols; col++) {
            let cards = board[col];
            console.log("column " + col + ": " + cards.map(c2fp).join(" "));
        }
        console.log("stock: " + stock.map(c2fp).join(" "));
        console.log("complete: " + complete.map(c2fp).join(" "));
    }

    return { board: board,
             stock: stock,
             complete: complete,
             copy: copy,
             log: log,
             fingerprint: fingerprint }
}

function board_to_board(state) {

    function top_stack(col, start_row) {
        let column = state.board[col];
        if (column.length == 0)
            return { col: col,
                     row: -1,
                     length: 0,
                     card: null };
        let row = start_row < 0 ? column.length - 1 : start_row;
        let card = column[row];
        while (row > 0) {
            next_card = column[row - 1];
            if (next_card.suit != card.suit ||
                next_card.rank != RankAbove[card.rank])
                    break;
            row--;
            card = next_card;
        }
        return { length: column.length - row,
                 col: col,
                 row: row,
                 card: card };
    }

    function can_move(stacks, fcol, tcol) {
        // can_move finds all the moves from column fcol to column tcol.
        // The moves are separated into primary and secondary moves.
        // Primary moves are those that should be tried before dealing
        // from stack.  Secondary and tertiary moves are those that
        // should be tried after.  Tertiary moves are those that move
        // part of a stack onto another of the same suit; they leave
        // the top card the same in both columns, so are less interesting.
        // Assumes that fcol != tcol.

        // The score for a move is the larger height of the stack
        // formed in the destination column or exposed stack in
        // source column.  The idea is to favor moves that create
        // larger stacks.

        // console.log("can move: " + col + ", " + row + " => " + tcol);
        let moves = [];
        let fstack = stacks[fcol];
        if (fstack.length == 0) {
            // If "from" column is empty, there are no moves available.
            return moves;
        }
        let tstack = stacks[tcol];
        let fc = state.board[fcol];
        let tc = state.board[tcol];
        let fstack2 = top_stack(fstack.col, fstack.row - 1);
        let bs_top = fstack.length;
        let bt_top = tstack.length;
        let tcard = tc.length > 0 ? tc[tc.length - 1] : null;
        for (let i = 0; i < fstack.length; i++) {
            let row = fstack.row + i;
            let fcard = fc[row];
            if (tcard && tcard.rank != RankAbove[fcard.rank])
                // The (partial) stack can only be moved if the top moving
                // card is exactly one rank below the top target card
                continue;
            let n = fstack.length - i;
            let partial = n > 0;
            let same = tcard ? tcard.suit == fcard.suit : false;
            let bs_next = partial ? 0 : fstack2.length;
            let as_top = partial ? bs_top - n : bs_next;
            let at_top = same ? bt_top + n : n;
            let dtc = as_top + at_top - bs_top - bt_top;
            let dml = Math.max(as_top, at_top) - Math.max(bs_top, bt_top);
            let score = dtc + dml;
            if (score < 0)
                // Do not bother with bad moves
                continue;
            let move = { type: "board_to_board",
                         card: fc[row],
                         apply_func: apply_board_to_board,
                         from_col: fcol,
                         from_row: row,
                         to_col: tcol,
                         score: score };
            moves.push(move);
            // Since only one card in stack is exactly one rank below
            // the top target card, we can stop after finding it
            break;
        }
        return moves;
    }

    // First we find the stacks (consecutive cards of the same suit)
    // for each column.  If any stack is complete (A->K), we create
    // a move to put the stack away.
    let complete_moves = [];
    let board_moves = [];
    let stacks = [];
    for (let col = 0; col < SpiderNumCols; col++) {
        let stack = top_stack(col, -1);
        stacks[col] = stack;
        if (stack.length >= 13) {
            // console.log("found full stack: " + stack.length);
            complete_moves.push({ type: "board_to_complete",
                                  card: null,
                                  apply_func: apply_board_to_complete,
                                  col: col });
        }
    }

    for (let fcol = 0; fcol < SpiderNumCols; fcol++) {
        for (let tcol = 0; tcol < SpiderNumCols; tcol++) {
            if (fcol == tcol)
                continue;
            let moves = can_move(stacks, fcol, tcol);
            board_moves.push(...moves);
        }
    }
    // combine secondary and tertiary moves since they will all
    // be tried after dealing from stock.
    function compare_moves(m1, m2) {
        return m2.score - m1.score;
    }
    board_moves.sort(compare_moves);
    complete_moves.push(...board_moves);
    return complete_moves;
}

function apply_board_to_board(old_state, move, detailed) {
    let state = old_state.copy();
    let from_column = state.board[move.from_col];
    let to_column = state.board[move.to_col];
    let cards = from_column.splice(move.from_row);
    to_column.push(...cards);
    if (!detailed)
        return state;
    let moved = [];
    for (let i = 0; i < cards.length; i++) {
        let s_row = from_column.length + i;
        let d_row = to_column.length - cards.length + i;
        moved.push({ card: cards[i],
                     src_col: move.from_col,
                     src_row: s_row,
                     src_z: s_row,
                     dst_col: move.to_col,
                     dst_row: d_row,
                     dst_z: d_row });
    }
    return { state: state,
             moved: moved,
             max_height: to_column.length };
}

function apply_board_to_complete(old_state, move, detailed) {
    let state = old_state.copy();
    let column = state.board[move.col];
    let cards = column.splice(column.length - 13);
    state.complete.push(...cards);
    if (!detailed)
        return state;
    let moved = [];
    for (let i = 0; i < cards.length; i++) {
        let s_row = column.length + i;
        let d_row = state.complete.length - cards.length + i;
        moved.push({ card: cards[i],
                     src_col: move.col,
                     src_row: s_row,
                     src_z: s_row,
                     dst_col: 0,
                     dst_row: CompleteRow,
                     dst_z: d_row });
    }
    return { state: state,
             moved: moved,
             max_height: column.length };
}

function stock_to_board(state) {
    let moves = [];
    let num_cards = Math.min(state.stock.length, SpiderNumCols);
    if (num_cards > 0)
        moves.push({ type: "stock_to_board",
                     card: null,
                     apply_func: apply_stock_to_board,
                     num_cards: num_cards });
    return moves;
}

function apply_stock_to_board(old_state, move, detailed) {
    let state = old_state.copy();
    let cards = state.stock.splice(state.stock.length - move.num_cards);
    for (let i = 0; i < cards.length; i++) {
        let n = cards.length - i - 1;
        let column = state.board[i];
        column.push(cards[n]);
    }
    if (!detailed)
        return state;
    let moved = [];
    let max_height = 0;
    for (let i = 0; i < cards.length; i++) {
        let n = cards.length - i - 1;
        let s_col = state.stock.length + i;
        let d_row = state.board[i].length - 1;
        moved.push({ card: cards[n],
                     src_col: s_col,
                     src_row: StockRow,
                     src_z: s_col,
                     dst_col: i,
                     dst_row: d_row,
                     dst_z: d_row });
        let height = state.board[i].length;
        if (height > max_height)
            max_height = height;
    }
    return { state: state,
             moved: moved,
             max_height: max_height };
}

function make_init_state() {
    // Code wrapped in function so that local variables do not leak
    // to other functions.

    // Build data structures
    let complete = [];
    let stock = [];
    let board = [];
    for (let col = 0; col < SpiderNumCols; col++)
        board[col] = [];
    for (let img of spider_div.querySelectorAll("img")) {
        let col = parseInt(img.getAttribute("data-col"), 10);
        let row = parseInt(img.getAttribute("data-row"), 10);
        let suit = img.getAttribute("data-suit");
        let rank = img.getAttribute("data-rank");
        let key = img.getAttribute("data-key");
        let card = make_card(suit, rank, key, row, col, img);
        if (row == StockRow)
            stock[col] = card;
        else if (row != CompleteRow)
            board[col][row] = card;
    }
    // console.log("initialized");
    // console.log(complete);
    // console.log(board);
    // console.log(stock);
    let init_state = make_state(complete, board, stock);
    // console.log(init_state);
    // console.log("fingerprint: " + init_state.fingerprint());
    return init_state;
}

async function depth_first_search(stop_time) {

    let solution = null;
    let max_depth = 1000;

    async function find_solution(old_state, history, seen, depth) {
        if (performance.now() > stop_time)
            throw new Error("search timed out");

        // We are looking for *any* solution, so we can
        // return immediately if we find one.
        if (max_depth > 0 && depth >= max_depth) {
            // Possible optimization when looking for shortest solution?
            if (debugging)
                console.log("reached max_depth " + depth + " / " + max_depth);
            return false;
        }
        
        // If all the cards are in the complete pile, we have a solution
        if (old_state.complete.length == NumCards) {
            // solution = history.slice();
            console.log("found solution, " + history.length + " steps");
            max_depth = depth;
            solution = optimize_solution(history);
            // last_move should be null since the last move in a solution
            // must be a board_to_complete move.
            console.log("reduced solution, " + solution.length + " steps");
            return true;
        }

        if (debugging) {
            console.log("depth: " + depth);
            old_state.log();
        }

        // There are two types of moves that we can make:
        // - shift card(s) from one column to another
        // - deal from stock
        // If none of these lead to a solution, we are at a dead end

        // console.log("find moves");
        let b_moves = board_to_board(old_state);
        // console.log(b_moves);
        let d_moves = stock_to_board(old_state);
        // console.log(d_moves);
        let moves = b_moves.concat(d_moves);
        // console.log(moves);

        // Try each move and see if we get a solution
        // console.log("try moves");
        let any_solution = false;
        for (let move of moves) {
            // console.log(move);
            let state;
            let result;
            if (!animate)
                state = move.apply_func(old_state, move, false);
            else {
                result = move.apply_func(old_state, move, true);
                state = result.state;
            }

            // If move cannot be applied or resulting state has already
            // been visited, just continue to next move
            if (state == null)
                continue;
            let fp = state.fingerprint();
            if (seen.has(fp)) {
                // console.log("skipping previously visited state");
                continue;
            }
            seen.add(fp);

            // console.log(state);
            if (animate) {
                // console.log(state.fingerprint());
                // animate forward action
                let promises = [];
                for (let info of result.moved) {
                    let pos = find_position(info.dst_col, info.dst_row);
                    let img = info.card.img;
                    // console.log("moving " + img.style.left + "," +
                    //             img.style.top + " => " +
                    //             pos.left + "," + pos.top);
                    promises.push(move_card(img, pos.left,
                                            pos.top, info.dst_z, 300));
                }
                // console.log(promises);
                await Promise.allSettled(promises);
                // console.log("moved cards");
            }
            if (debugging && move.type == "board_to_complete")
                console.log(depth + ": board_to_complete: pile length: " +
                            state.complete.length);
            history.push(move);
            let found = await find_solution(state, history, seen, depth + 1);
            history.pop();
            any_solution = any_solution || found;
            // console.log("ending " + depth + " " + move.type);
            if (debugging) {
                // animate backward action
                let promises = [];
                for (let info of result.moved) {
                    let pos = find_position(info.src_col, info.src_row);
                    let img = info.card.img;
                    promises.push(move_card(img, pos.left,
                                            pos.top, info.src_z, 100));
                }
                await Promise.allSettled(promises);
            }

            // If we want the first solution, we return immediately.
            // Otherwise, we keep trying, but with max_depth set to
            // the smallest known solution size, so we limit the search.
            // (Still takes forever to finish though.)
            if (true && found)
                return true;
            // console.log("end " + depth + " " + move.type);
        }

        if (debugging)
            console.log("end depth: " + depth);
        return any_solution;
    }

    async function init_search() {
        // Code wrapped in function so that local variables do not leak
        // to other functions.

        let init_state = make_init_state();
        // console.log(init_state);
        // console.log("fingerprint: " + init_state.fingerprint());
        let history = [];
        let seen = new Set();
        seen.add(init_state.fingerprint());
        if (!await find_solution(init_state, history, seen, 0)) {
            alert("No solution found.");
            return;
        }
        alert("Found solution using " + solution.length + " steps");
        // console.log(solution);
        controller = await Solution(init_state, solution)
        player_controls.set_controller(controller);
    };

    function optimize_solution(history) {
        let solution = [];
        let last_move = null;
        for (let i = 0; i < history.length; i++) {
            // move.card is non-null only for "board_to_board" moves
            // If the move is not a shift, then we immediately add
            // it (and last move, if any) to the solution
            let move = history[i];
            if (move.card == null) {
                if (last_move != null) {
                    solution.push(last_move);
                    last_move = null;
                }
                solution.push(move);
                continue;
            }
            // If the previous move was a shift, but it is moving
            // a different card, then we add the previous move to
            // the solution and make keep this move to check whether
            // it can be combined with the next move.  If the last
            // move is moving exactly the same card as this, we
            // combine the two into a single move whose source is
            // from the last move and destination is from this move.
            if (last_move == null)
                last_move = move;
            else if (last_move.card != move.card) {
                solution.push(last_move);
                last_move = move;
            } else {
                let new_move = { ...last_move };
                new_move.to_col = move.to_col;
                last_move = new_move;
            }
        }
        return solution;
    }

    await init_search();
}

async function breadth_first_search() {

    let search_list = [];

    function is_solution(old_state) {
        // If all the cards are in the complete pile, we have a solution
        return old_state.complete.length == NumCards;
    }

    function add_to_search(old_state, seen) {
        // There are two types of moves that we can make:
        // - shift card(s) from one column to another
        // - deal from stock
        // If none of these lead to a solution, we are at a dead end

        // console.log("find moves");
        let b_moves = board_to_board(old_state);
        // console.log(b_moves);
        let d_moves = stock_to_board(old_state);
        // console.log(d_moves);
        let moves = b_moves.concat(d_moves);
        // console.log(moves);

        // Unlike depth first search, we just append resulting
        // state from each move to the search list and return
        for (let move of moves) {
            // console.log(move);
            let state = move.apply_func(old_state, move, false);
            // If move cannot be applied or resulting state has already
            // been visited, just continue to next move
            if (state == null)
                continue;
            let fp = state.fingerprint();
            if (seen.has(fp)) {
                // console.log("skipping previously visited state");
                continue;
            }
            seen.add(fp);
            append_state(state, old_state, move);
        }
        return false;
    }

    function append_state(state, parent, move) {
        search_list.push(state);
        state.parent = parent;
        state.move = move;
    }

    function get_next_state() {
        return search_list.shift();
    }

    async function init_search() {
        // Code wrapped in function so that local variables do not leak
        // to other functions.

        let init_state = make_init_state();
        // console.log(init_state);
        // console.log("fingerprint: " + init_state.fingerprint());
        append_state(init_state, null, null);
        let seen = new Set();
        seen.add(init_state.fingerprint());
        let end_state = null;
        let report_at = 100000;
        while (search_list.length > 0 && end_state == null) {
            let state = get_next_state();
            if (is_solution(state)) {
                console.log("found solution!");
                end_state = state;
            } else {
                add_to_search(state, seen);
                if (search_list.length >= report_at) {
                    console.log("search length: " + search_list.length);
                    report_at += 100000;
                }
            }
        }
        if (end_state == null)
            alert("No solution found.");
        else {
            let move_list = [];
            for (let state = end_state; state != null; state = state.parent)
                solution.push(state.move);
            solution.reverse();
            alert("Found solution using " + solution.length + " steps");
        }
        // console.log(solution);
        controller = await Solution(init_state, solution)
        player_controls.set_controller(controller);
    };

    await init_search();
}

//=============================================================================
// Code for interacting with player controls
// (player as in media player, not user)
//=============================================================================

async function Solution(state, move_list) {
    var init_state = state;
    var moves = move_list;
    var move_position = 0;

    function get_state() {
        return {
            has_prev: move_position > 0,
            has_next: move_position < moves.length
        }
    }

    async function forward() {
        let move = moves[move_position];
        let promises = [];
        for (let info of move.result.moved) {
            let pos = find_position(info.dst_col, info.dst_row);
            let img = info.card.img;
            promises.push(move_card(img, pos.left, pos.top, info.dst_z, 500));
        }
        move_position++;
        return Promise.allSettled(promises);
    }

    async function backward() {
        move_position--;
        let move = moves[move_position];
        let promises = [];
        for (let info of move.result.moved) {
            let pos = find_position(info.src_col, info.src_row);
            let img = info.card.img;
            promises.push(move_card(img, pos.left, pos.top, info.src_z, 500));
        }
        return Promise.allSettled(promises);
    }

    async function restart() {
        let promises = [];
        for (let col = 0; col < SpiderNumCols; col++)
            for (let card of init_state.board[col])
                promises.push(move_card(card.img, card.init_left,
                                        card.init_top, card.init_z, 500));
        for (let card of init_state.stock)
            promises.push(move_card(card.img, card.init_left,
                                    card.init_top, card.init_z, 500));
        await Promise.allSettled(promises);
        move_position = 0;
    }

    async function initialize() {
        // First we run through all the moves to find the maximum
        // number of cards in a column.  Then we back calculate
        // the vertical card overlap.
        let state = init_state;
        let moved = null;
        let max_cards = InitialCardsPerCol;
        for (let move of moves) {
            move.result = move.apply_func(state, move, true);
            if (move.result.max_height > max_cards)
                max_cards = move.result.max_height;
            state = move.result.state;
        }
        // console.log("max height: " + max_cards);
        let h_scale = layout.board_height / CardHeight - layout.section_gap;
        layout.vertical_overlap = (h_scale - 1) / max_cards;

        // To set things up, we move all cards on the board to their
        // new vertical position if necessary.  There should be no
        // cards on the foundations, and the stock cards do not need
        // to be repositioned.
        if (max_cards != InitialCardsPerCol) {
            let promises = [];
            for (let col = 0; col < SpiderNumCols; col++) {
                let column = init_state.board[col];
                // Start at row 1 since the first card in the column
                // will stay in the same position
                for (let row = 1; row < column.length; row++) {
                    let img = column[row].img;
                    let pos = board_position(col, row);
                    promises.push(move_card(img, pos.left, pos.top, row, 500));
                }
            }
            await Promise.allSettled(promises);
        }
        // console.log("packed board");

        // Now we record the card positions so that we can reset quickly
        function record_pos(card) {
            card.init_left = card.img.style.left;
            card.init_top = card.img.style.top;
            card.init_z = card.img.style.zIndex;
        }
        for (let col = 0; col < SpiderNumCols; col++)
            for (let card of init_state.board[col])
                record_pos(card);
        for (let card of init_state.stock)
            record_pos(card);
        // complete should be empty so no need to record there
    };

    await initialize();
    return {
        play_interval: 2000,        // interval between moves while playing
        get_state: get_state,
        forward: forward,
        backward: backward,
        restart: restart,
    };
}

//=============================================================================
// Card transition code
//=============================================================================

async function move_card(img, left, top, z, duration) {
    // duration in milliseconds
    return new Promise((resolve) => {
        // img.addEventListener("transitionrun", run_transition, {once:true});
        // img.addEventListener("transitionend", end_transition, {once:true});
        // img.addEventListener("transitioncancel", cancel_transition, {once:true});
        // Then we transition the source image to the end image
        // and we move the transition image over the destination image
        img.style.transitionProperty = "all";
        img.style.transitionDuration = (duration / 1000).toFixed(2) + "s";
        img.style.left = left;
        img.style.top = top;
        img.style.zIndex = z;
        setTimeout(resolve, duration);
        // console.log(img);
    });
}

//=============================================================================
// Test code
//=============================================================================

function test_fill() {

    var test_spider = {
        0: [ "JH", "2S", "7H", "AS", "7S", "2H" ],
        1: [ "5H", "TH", "6H", "8S", "KS", "4H" ],
        2: [ "9S", "8S", "7S", "7H", "AH", "QS" ],
        3: [ "5S", "AH", "6S", "QS", "KS", "3H" ],
        4: [ "JS", "JH", "JS", "8H", "4H" ],
        5: [ "6S", "7S", "3H", "QS", "5S" ],
        6: [ "7S", "4S", "AS", "QH", "4S" ],
        7: [ "TH", "QH", "4H", "2H", "AS" ],
        8: [ "JH", "3H", "5H", "2H", "5H" ],
        9: [ "9S", "3S", "KS", "4S", "6H" ],
    };
    var test_stock = [
        "3S", "2S", "3S", "TS", "9H", "QH", "6S", "5S", "AH", "TH",
        "KH", "8S", "3H", "9S", "9H", "JS", "7H", "5S", "4S", "8H",
        "9H", "TS", "8H", "QH", "KS", "TS", "8H", "KH", "TH", "JH",
        "4H", "9H", "2S", "QS", "8S", "3S", "5H", "2H", "KH", "6H",
        "6S", "AS", "9S", "6H", "7H", "AH", "KH", "2S", "JS", "TS"
    ];
    let card_index = {};

    function suit_rank(card) {
        let suit = SuitMap[card[1]];
        let rank = RankMap[card[0]];
        if (!suit || !rank)
            throw new Error("Bad card: " + card);
        return [suit, rank];
    }

    function get_index(card, suit) {
        let index = card_index[card];
        if (index == null)
            return 0;
        else {
            if (index >= SuitCount[suit])
                throw new Error("Duplicate card: " + card);
            return index;
        }
    }

    for (let col = 0; col < SpiderNumCols; col++) {
        let cards = test_spider[col];
        for (let row = 0; row < cards.length; row++) {
            let card = cards[row];
            let [suit, rank] = suit_rank(card);
            let index = get_index(card, suit);
            let key = card_key(rank, suit, index); 
            position_assign(find_board_card(row, col), rank, suit, key);
            card_index[card] = index + 1;
        }
    }
    for (let i = 0; i < test_stock.length; i++) {
        let n = test_stock.length - 1 - i;
        let card = test_stock[i];
        let [suit, rank] = suit_rank(card);
        let index = get_index(card, suit);
        let key = card_key(rank, suit, index); 
        position_assign(find_stock_card(n), rank, suit, key);
        card_index[card] = index + 1;
    }

    let assigned = 0;
    for (let card in card_index)
        assigned += card_index[card];
    if (assigned != NumCards)
        throw new Error("Wrong number of cards: " + assigned);
}
