export class Crunch {
    constructor({
        minLength,
        maxLength,
        charset,
        prefix = "",
        suffix = "",
    }) {
        if (!Number.isInteger(minLength) || minLength < 0) {
            throw new Error("minLength deve ser um inteiro >= 0");
        }

        if (!Number.isInteger(maxLength) || maxLength < minLength) {
            throw new Error("maxLength deve ser >= minLength");
        }

        if (!charset || typeof charset !== "string") {
            throw new Error("charset deve ser uma string");
        }

        this.minLength = minLength;
        this.maxLength = maxLength;
        this.charset = [...new Set(charset)];
        this.prefix = prefix;
        this.suffix = suffix;
    }

    *generateLength(length, position = 0, buffer = []) {
        if (position === length) {
            yield buffer.join("");
            return;
        }

        for (const char of this.charset) {
            buffer[position] = char;

            yield* this.generateLength(
                length,
                position + 1,
                buffer
            );
        }
    }

    *generate() {
        for (
            let length = this.minLength;
            length <= this.maxLength;
            length++
        ) {
            for (const value of this.generateLength(length)) {
                yield `${this.prefix}${value}${this.suffix}`;
            }
        }
    }

    forEach(callback) {
        for (const value of this.generate()) {
            callback(value);
        }
    }

    count() {
        let total = 0;

        for (
            let length = this.minLength;
            length <= this.maxLength;
            length++
        ) {
            total += this.charset.length ** length;
        }

        return total;
    }

    toArray() {
        return [...this.generate()];
    }
}