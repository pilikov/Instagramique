import { describe, it, expect } from "vitest";
import {
  parseInstagramExport,
  parseInstagramExportHTML,
} from "../scraper";

describe("parseInstagramExport", () => {
  it("parses new-style Instagram data export (array of string_list_data)", () => {
    const json = JSON.stringify([
      {
        title: "",
        media_list_data: [],
        string_list_data: [
          {
            href: "https://www.instagram.com/user_one",
            value: "user_one",
            timestamp: 1709123456,
          },
        ],
      },
      {
        title: "",
        media_list_data: [],
        string_list_data: [
          {
            href: "https://www.instagram.com/user_two",
            value: "user_two",
            timestamp: 1709123457,
          },
        ],
      },
    ]);

    const result = parseInstagramExport(json);
    expect(result).toHaveLength(2);
    expect(result[0].username).toBe("user_one");
    expect(result[1].username).toBe("user_two");
    expect(result[0].timestamp).toBe(1709123456);
  });

  it("parses wrapped relationships_followers format", () => {
    const json = JSON.stringify({
      relationships_followers: [
        {
          string_list_data: [
            { value: "follower1", href: "https://www.instagram.com/follower1", timestamp: 0 },
          ],
        },
      ],
    });

    const result = parseInstagramExport(json);
    expect(result).toHaveLength(1);
    expect(result[0].username).toBe("follower1");
  });

  it("extracts username from href when value is empty", () => {
    const json = JSON.stringify([
      {
        string_list_data: [
          { value: "", href: "https://www.instagram.com/from_href_user", timestamp: 0 },
        ],
      },
    ]);

    const result = parseInstagramExport(json);
    expect(result).toHaveLength(1);
    expect(result[0].username).toBe("from_href_user");
  });

  it("returns empty for invalid JSON", () => {
    const result = parseInstagramExport("not json at all");
    expect(result).toHaveLength(0);
  });

  it("returns empty for unrecognized format", () => {
    const result = parseInstagramExport(JSON.stringify({ foo: "bar" }));
    expect(result).toHaveLength(0);
  });

  it("handles mixed data export with nested followers key", () => {
    const json = JSON.stringify({
      followers: [
        { string_list_data: [{ value: "u1", href: "", timestamp: 0 }] },
        { string_list_data: [{ value: "u2", href: "", timestamp: 0 }] },
      ],
    });

    const result = parseInstagramExport(json);
    expect(result).toHaveLength(2);
  });
});

describe("parseInstagramExportHTML", () => {
  it("parses Instagram HTML export with profile links", () => {
    const html = `
      <html><body>
        <div>
          <a href="https://www.instagram.com/alice">alice</a>
          <a href="https://www.instagram.com/bob">bob</a>
          <a href="https://www.instagram.com/charlie">charlie</a>
        </div>
      </body></html>
    `;

    const result = parseInstagramExportHTML(html);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.username)).toEqual(["alice", "bob", "charlie"]);
  });

  it("filters out non-profile links", () => {
    const html = `
      <a href="https://www.instagram.com/alice">alice</a>
      <a href="https://www.instagram.com/explore">explore</a>
      <a href="https://www.instagram.com/accounts">accounts</a>
      <a href="https://www.instagram.com/p/ABC123">post</a>
    `;

    const result = parseInstagramExportHTML(html);
    expect(result).toHaveLength(1);
    expect(result[0].username).toBe("alice");
  });

  it("returns empty for HTML without Instagram links", () => {
    const result = parseInstagramExportHTML("<html><body><p>Hello</p></body></html>");
    expect(result).toHaveLength(0);
  });
});
