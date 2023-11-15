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
    readonly width: number;
    readonly height: number;
    private grid: (T | undefined)[][];
    private listeners: BoardListener<T>[] = [];

    constructor(generator: Generator<T>, width: number, height: number) {
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

        // 交换瓷砖
        [this.grid[first.row][first.col], this.grid[second.row][second.col]] =
            [this.grid[second.row][second.col], this.grid[first.row][first.col]];

        // 检测匹配
        const matches = this.findMatches();

        // 如果没有匹配，撤销移动并返回
        if (matches.length === 0) {
            [this.grid[first.row][first.col], this.grid[second.row][second.col]] =
                [this.grid[second.row][second.col], this.grid[first.row][first.col]];
            return;
        }

        // 处理匹配
        this.handleMatches(matches);

        // 触发事件
        matches.forEach(match => {
            this.listeners.forEach(listener => listener({ kind: 'Match', match }));
        });

        // 填补空位
        this.refillBoard();

        // 触发填补事件
        this.listeners.forEach(listener => listener({ kind: 'Refill' }));
    }


    private findMatches(): Match<T>[] {
        const matches: Match<T>[] = [];
        // 示例：仅检查水平方向的匹配
        for (let row = 0; row < this.height; row++) {
            for (let col = 0; col < this.width - 2; col++) {
                if (this.grid[row][col] !== undefined &&
                    this.grid[row][col] === this.grid[row][col + 1] &&
                    this.grid[row][col] === this.grid[row][col + 2]) {
                    // @ts-ignore
                    matches.push({
                        matched: this.grid[row][col],
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
            }
        }
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
        }
    }

}
