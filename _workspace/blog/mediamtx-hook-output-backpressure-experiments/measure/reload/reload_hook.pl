#!/usr/bin/perl
# Writes 1,000 numbered lines, 2 ms apart.
$| = 1;
for my $i (1 .. 1000) { print "r $i\n"; select(undef, undef, undef, 0.002); }
