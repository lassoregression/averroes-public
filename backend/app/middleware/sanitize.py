"""Input and output sanitization."""
import nh3


def sanitize_html(text: str) -> str:
    """Strip all HTML tags from text. Used on LLM output before sending to frontend."""
    return nh3.clean(text, tags=set())


def sanitize_llm_output(text: str) -> str:
    """Sanitize LLM output — allow markdown but strip dangerous HTML."""
    allowed_tags = {"p", "br", "strong", "em", "code", "pre", "ul", "ol", "li", "h1", "h2", "h3", "h4", "blockquote"}
    return nh3.clean(text, tags=allowed_tags)
