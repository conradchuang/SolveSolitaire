#!/usr/bin/python3


# Code for solving difficult tripyramid solitaire games.
#
# A card is described only by its rank, eg A, 2, ...,
# and is stored as a string.  This allows for
# multi-character values such as '10'.
#
# Tripyramid cards are described in "pyramid", which is
# a dictionary from "place" to card.  "place" is a
# 2-tuple of (row, column).  The bottom row of the pyramid
# has index 0; the top row has index 3.  In each row, the
# left-most card has index 0.  On rows 2 and 3, some
# columns are unused.  The indexing scheme is set up to
# simplify keeping track of which cards are removable
# and which are present but not removable.
#
# The deck is simply a list of cards.
#
# All permutations of pyramid card removal are tried.
# To limit computation time, a cache of "seen"
# configurations (card at top of deck, number of cards
# remaining in deck, removable pyramid cards, played
# pyramid cards, etc) is maintained to so that multiple
# paths leading to the same configuration are fully
# evaluated only once.
#
# April 19, 2022


Adjacency = {
	'A': ('K', '2'),
	'2': ('A', '3'),
	'3': ('2', '4'),
	'4': ('3', '5'),
	'5': ('4', '6'),
	'6': ('5', '7'),
	'7': ('6', '8'),
	'8': ('7', '9'),
	'9': ('8', '10'),
	'10': ('9', 'J'),
	'J': ('10', 'Q'),
	'Q': ('J', 'K'),
	'K': ('Q', 'A'),
}


def main():
	for c in pyramid.values():
		if c not in Adjacency:
			print(c, "is not a valid card")
			return
	removable = set([p for p in pyramid.keys() if p[0] == 0])
	# print("Deck", len(removable), deck[0])
	n = play_card(None, deck[0], removable, deck[1:], set(), [], set())
	if n == 0:
		print("No solutions found.")
	else:
		print(n, "solutions found.")


def play_card(place, card, removable, deck, played, history, seen, depth=1):
	fingerprint = (card, len(deck), frozenset(removable))
	if fingerprint in seen:
		return 0
	seen.add(fingerprint)
	history = history + [record(place, card, removable, deck)]
	if len(removable) == 0:
		report(history)
		return 1
	count = 0
	for p in removable:
		c = pyramid[p]
		if not adjacent(card, c):
			continue
		rem = removable.copy()
		pl = played.copy()
		remove_place(rem, pl, p)
		#print(" "*depth, "Take", len(rem), c, p, str_removable(rem))
		count += play_card(p, c, rem, deck, pl,
				   history, seen, depth+1)
	if deck:
		#print(" "*depth, "Deck", len(removable), deck[0])
		count += play_card(None, deck[0], removable, deck[1:], played,
				   history, seen, depth+1)
	return count


def adjacent(c1, c2):
	return c2 in Adjacency[c1]


def remove_place(removable, played, p):
	# Remove card in given place.
	# This may make up to two cards in row above become removable.
	removable.remove(p)
	played.add(p)
	row, col = p
	_add_place(removable, played, row, col-1, row+1, col-1)
	_add_place(removable, played, row, col+1, row+1, col)


def _add_place(removable, played, row, col, new_row, new_col):
	# If there is no card in (row, col) we add (new_row, new_col)
	# to removable list
	p = (row, col)
	if p not in pyramid:
		# There was never a card in this place
		return
	if p not in played:
		# Card in place is still there
		return
	np = (new_row, new_col)
	if np not in pyramid:
		# There is no card in the new place
		return
	removable.add(np)


def str_removable(rem):
	slist = []
	for p in sorted(rem):
		slist.append("%s/%d%d" % (pyramid[p], p[0], p[1]))
	return ' '.join(slist)


def str_deck(deck):
	return ','.join(deck)


def record(place, card, removable, deck):
	return (place, card, str_deck(deck), str_removable(removable))


def report(history):
	print("Solution:")
	for p, c, deck, rem in history:
		if p is None:
			place = "Deck %s" % c
		else:
			place = "Take %s (%d,%d)" % (c, p[0], p[1])
		print("  %s" % place)
		# For debugging:
		# print("  %s - %s - %s" % (place, rem, deck))
	import sys
	sys.stdout.flush()


if False:
	# No solution?
	pyramid = {
		(3, 0): '7',
		(3, 3): '2',
		(3, 6): '7',
		(2, 0): '5',
		(2, 1): '7',
		(2, 3): '2',
		(2, 4): 'J',
		(2, 6): '4',
		(2, 7): 'Q',
		(1, 0): 'J',
		(1, 1): '3',
		(1, 2): 'Q',
		(1, 3): '3',
		(1, 4): '9',
		(1, 5): '4',
		(1, 6): '6',
		(1, 7): 'K',
		(1, 8): '9',
		(0, 0): 'A',
		(0, 1): '10',
		(0, 2): '9',
		(0, 3): '6',
		(0, 4): '5',
		(0, 5): '2',
		(0, 6): '3',
		(0, 7): '8',
		(0, 8): 'J',
		(0, 9): 'A',
	}
	deck = [
		'J', '2', 'K', 'K', '8',
		'10', 'Q', '6', '3', '6',
		'8', '10', 'K', '5', '8',
		'Q', '9', '10', '4', '5',
		'A', '7', 'A', '4',
	]


if False:
	# No solution?
	pyramid = {
		(3, 0): '10',
		(3, 3): '8',
		(3, 6): '7',

		(2, 0): '5',
		(2, 1): '4',
		(2, 3): '6',
		(2, 4): '8',
		(2, 6): 'Q',
		(2, 7): '7',

		(1, 0): 'J',
		(1, 1): 'A',
		(1, 2): '10',
		(1, 3): 'A',
		(1, 4): '4',
		(1, 5): '9',
		(1, 6): '3',
		(1, 7): 'A',
		(1, 8): '7',

		(0, 0): '3',
		(0, 1): 'J',
		(0, 2): '6',
		(0, 3): '2',
		(0, 4): '3',
		(0, 5): '9',
		(0, 6): 'K',
		(0, 7): 'K',
		(0, 8): '8',
		(0, 9): '9',
	}
	deck = [
		'5', 'J', 'K', '2', 'K',
		'Q', '5', '4', '7', '10',
		'6', '6', '4', '2', 'J',
		'5', 'Q', '8', 'Q', '2',
		'9', '10', '3', 'A',
	]


if False:
	# Has solution
	pyramid = {
		(3, 0): '2',
		(3, 3): '9',
		(3, 6): '6',
		(2, 0): 'K',
		(2, 1): '10',
		(2, 3): '10',
		(2, 4): '10',
		(2, 6): 'A',
		(2, 7): '7',
		(1, 0): '7',
		(1, 1): '5',
		(1, 2): '7',
		(1, 3): '4',
		(1, 4): 'A',
		(1, 5): '8',
		(1, 6): '8',
		(1, 7): '2',
		(1, 8): '9',
		(0, 0): 'J',
		(0, 1): 'K',
		(0, 2): '5',
		(0, 3): 'Q',
		(0, 4): '8',
		(0, 5): '6',
		(0, 6): '10',
		(0, 7): 'A',
		(0, 8): '9',
		(0, 9): 'Q',
	}
	deck = [
		'2', 'J', '7', '5', '6',
		'6', '3', '9', 'K', '3',
		'4', 'Q', '5', '4', 'J',
		'8', '3', 'J', '3', '2',
		'A', 'K', '4', 'Q',
	]


if False:
	# Has solution
	pyramid = {
		(3, 0): '6',
		(3, 3): '6',
		(3, 6): '8',
		(2, 0): 'A',
		(2, 1): 'J',
		(2, 3): '5',
		(2, 4): 'Q',
		(2, 6): '4',
		(2, 7): '9',
		(1, 0): '8',
		(1, 1): 'Q',
		(1, 2): '2',
		(1, 3): '9',
		(1, 4): 'J',
		(1, 5): '5',
		(1, 6): '8',
		(1, 7): 'Q',
		(1, 8): '9',
		(0, 0): '3',
		(0, 1): '2',
		(0, 2): '6',
		(0, 3): '5',
		(0, 4): 'J',
		(0, 5): '4',
		(0, 6): '6',
		(0, 7): 'K',
		(0, 8): '7',
		(0, 9): 'Q',
	}
	deck = [
		'4', 'K', 'K', '7', '2',
		'7', '3', '10', '10', '7',
		'8', '9', '5', '3', '2',
		'J', '10', 'K', 'A', '4',
		'10', 'A', '3', 'A',
	]


if False:
	# Has solution
	pyramid = {
		(3, 0): '8',
		(3, 3): '8',
		(3, 6): '5',
		(2, 0): 'A',
		(2, 1): '10',
		(2, 3): 'A',
		(2, 4): '8',
		(2, 6): '2',
		(2, 7): '5',
		(1, 0): '3',
		(1, 1): 'Q',
		(1, 2): '9',
		(1, 3): '9',
		(1, 4): 'A',
		(1, 5): 'Q',
		(1, 6): '3',
		(1, 7): 'J',
		(1, 8): '10',
		(0, 0): '7',
		(0, 1): '5',
		(0, 2): '9',
		(0, 3): '2',
		(0, 4): '4',
		(0, 5): '9',
		(0, 6): 'J',
		(0, 7): 'K',
		(0, 8): '2',
		(0, 9): '8',
	}
	deck = [
		'4', '3', 'J', 'J', '6',
		'3', '5', '6', 'Q', '7',
		'Q', '10', 'K', '6', '2',
		'4', '10', 'A', '4', '6',
		'K', '7', 'K', '7',
	]


if True:
	# Has solution?
	pyramid = {
		(3, 0): 'K',	# Top of pyramid
		(3, 3): '7',
		(3, 6): 'J',
		(2, 0): '6',	# Second layer
		(2, 1): '6',
		(2, 3): '5',
		(2, 4): '2',
		(2, 6): '8',
		(2, 7): 'A',
		(1, 0): '2',	# Third layer
		(1, 1): 'K',
		(1, 2): '10',
		(1, 3): '2',
		(1, 4): '3',
		(1, 5): 'Q',
		(1, 6): '8',
		(1, 7): '10',
		(1, 8): '4',
		(0, 0): '8',	# Bottom layer
		(0, 1): '6',
		(0, 2): '5',
		(0, 3): '9',
		(0, 4): 'Q',
		(0, 5): '4',
		(0, 6): '4',
		(0, 7): '9',
		(0, 8): '6',
		(0, 9): 'K',
	}
	deck = [
		'10', '2', '10', '4', '7',
		'J', '7', '7', 'A', '9',
		'9', 'K', 'J', '8', 'Q',
		'5', 'Q', '3', 'J', 'A',
		'3', 'A', '5', '3',
	]


if False:
	# Template for filling in hand
	pyramid = {
		(3, 0): 'X',	# Top of pyramid
		(3, 3): 'X',
		(3, 6): 'X',
		(2, 0): 'X',	# Second layer
		(2, 1): 'X',
		(2, 3): 'X',
		(2, 4): 'X',
		(2, 6): 'X',
		(2, 7): 'X',
		(1, 0): 'X',	# Third layer
		(1, 1): 'X',
		(1, 2): 'X',
		(1, 3): 'X',
		(1, 4): 'X',
		(1, 5): 'X',
		(1, 6): 'X',
		(1, 7): 'X',
		(1, 8): 'X',
		(0, 0): 'X',	# Bottom layer
		(0, 1): 'X',
		(0, 2): 'X',
		(0, 3): 'X',
		(0, 4): 'X',
		(0, 5): 'X',
		(0, 6): 'X',
		(0, 7): 'X',
		(0, 8): 'X',
		(0, 9): 'X',
	}
	deck = [
		'X', 'X', 'X', 'X', 'X',
		'X', 'X', 'X', 'X', 'X',
		'X', 'X', 'X', 'X', 'X',
		'X', 'X', 'X', 'X', 'X',
		'X', 'X', 'X', 'X',
	]


if __name__ == "__main__":
	main()
