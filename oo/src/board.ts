export type Generator<T> = { next: () => T };

export type Position = {
    row: number,
    col: number
};

export type Match<T> = {
    matched: T,
    positions: Position[]
};

export type BoardEvent<T> =
    | { kind: 'Match', match: Match<T> }
    | { kind: 'Refill' };

export type BoardListener<T> = (event: BoardEvent<T>) => void;

export class Board<T> {
    private score = 0;
    readonly width: number;
    readonly height: number;
    private readonly grid: (T | undefined)[][];
    private listeners: BoardListener<T>[] = [];
    private generator: Generator<T>;

    constructor(generator: Generator<T>, width: number, height: number) {
        this.generator = generator;
        this.width = width;
        this.height = height;
        this.grid = Array.from({ length: height }, () =>
            Array.from({ length: width }, () => generator.next()));
    }



    addListener(listener: BoardListener<T>) {
        this.listeners.push(listener);
    }

    positions(): Position[] {
        let positions: Position[] = [];
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width; col++) {
                positions.push({ row, col });
            }
        }
        return positions;
    }

    piece(p: Position): T | undefined {
        if (p.row >= 0 && p.row < this.height && p.col >= 0 && p.col < this.width) {
            return this.grid[p.row][p.col];
        }
        return undefined;
    }

    canMove(first: Position, second: Position): boolean {
        // 检查是否在同一行或同一列
        const isSameRow = first.row === second.row;
        const isSameCol = first.col === second.col;
        const isAdjacent = Math.abs(isSameRow ? first.col - second.col : first.row - second.row) === 1;

        return (isSameRow || isSameCol) && isAdjacent;
    }

    move(first: Position, second: Position) {
        if (!this.canMove(first, second)) {
            return;
        }

        [this.grid[first.row][first.col], this.grid[second.row][second.col]] =
            [this.grid[second.row][second.col], this.grid[first.row][first.col]];

        const matches = this.findMatches();

        if (matches.length === 0) {
            [this.grid[first.row][first.col], this.grid[second.row][second.col]] =
                [this.grid[second.row][second.col], this.grid[first.row][first.col]];
            return;
        }

        this.handleMatches(matches);

        matches.forEach(match => {
            this.listeners.forEach(listener => listener({ kind: 'Match', match }));
        });

        this.refillBoard();

        this.listeners.forEach(listener => listener({ kind: 'Refill' }));
    }


    private findMatches(): Match<T>[] {
        const matches: Match<T>[] = [];

        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 2; col++) {
                const current = this.grid[row][col];
                if (current !== undefined &&
                    current === this.grid[row][col + 1] &&
                    current === this.grid[row][col + 2]) {
                    matches.push({
                        matched: current as T,
                        positions: [{ row, col }, { row, col: col + 1 }, { row, col: col + 2 }]
                    });
                }
            }
        }
        return matches;
    }


    private handleMatches(matches: Match<T>[]) {
        for (const match of matches) {
            for (const pos of match.positions) {
                this.grid[pos.row][pos.col] = undefined;
                this.score += 10;
            }
        }
    }

    getScore() {
        return this.score;
    }

    private refillBoard() {
        for (let col = 0; col < this.width; col++) {
            let emptyIndex = this.height - 1;
            for (let row = this.height - 1; row >= 0; row--) {
                if (this.grid[row][col] === undefined) {
                    continue;
                }
                this.grid[emptyIndex][col] = this.grid[row][col];
                if (row !== emptyIndex) {
                    this.grid[row][col] = undefined;
                }
                emptyIndex--;
            }

            while (emptyIndex >= 0) {
                this.grid[emptyIndex][col] = this.generator.next();
                emptyIndex--;
            }
        }
    }



}
