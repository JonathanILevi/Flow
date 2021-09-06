#!/usr/bin/env sh
trash build/*
for group in src/*; do
	for package in "$group"/*; do
		rsync -r --exclude=".git/" "$package"/* build/
	done
done

