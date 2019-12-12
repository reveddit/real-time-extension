#!/bin/bash

for s in 16 24 32 48 128; do
    convert icon.png -resize ${s}x${s} src/icons/${s}.png
done
