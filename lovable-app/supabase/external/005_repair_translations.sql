-- ============================================================================
-- Migration 005: Repair Corrupted Machine Translations & Resynchronize Books
-- ============================================================================
-- Problem Addressed:
-- Prior to the Lumina translation quality gates, failed translation requests
-- silently fell back to returning the verbatim English source text. As a result,
-- 104 out of 191 chapters in the external database had metadata->>'text_ka'
-- byte-identical to the English source text_content, while books falsely
-- reported translatedLangs: ['ka'].
--
-- Actions:
-- 1. Identify and purge identical-to-source and non-Georgian text_ka values from chapters.
-- 2. Clear both chapters.metadata->'text_ka' and the chapters.text_ka column (if present).
-- 3. Reset chapter status to 'pending' if it was marked completed with corrupted text.
-- 4. Recompute books.metadata->'translatedLangs' based strictly on 100% verified Georgian chapters.
-- ============================================================================

DO $$
DECLARE
  corrupted_count integer := 0;
  repaired_books integer := 0;
BEGIN
  RAISE NOTICE 'Starting Migration 005: Repairing corrupted chapter translations...';

  -- Step 1: Count chapters with corrupt / source-leaked text_ka
  SELECT COUNT(*) INTO corrupted_count
  FROM public.chapters
  WHERE
    (
      (metadata->>'text_ka' IS NOT NULL AND length(trim(metadata->>'text_ka')) > 0)
      AND (
        trim(metadata->>'text_ka') = trim(text_content)
        OR metadata->>'text_ka' !~ '[\u10A0-\u10FF]'
      )
    );

  RAISE NOTICE 'Found % chapters with corrupted or untranslated text_ka.', corrupted_count;

  -- Step 2: Clear metadata->'text_ka' on corrupted rows
  UPDATE public.chapters
  SET
    metadata = metadata - 'text_ka',
    updated_at = now()
  WHERE
    (metadata->>'text_ka' IS NOT NULL AND length(trim(metadata->>'text_ka')) > 0)
    AND (
      trim(metadata->>'text_ka') = trim(text_content)
      OR metadata->>'text_ka' !~ '[\u10A0-\u10FF]'
    );

  -- Step 3: If text_ka exists as a native column on public.chapters, clean it as well
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chapters' AND column_name = 'text_ka'
  ) THEN
    EXECUTE '
      UPDATE public.chapters
      SET text_ka = NULL, updated_at = now()
      WHERE text_ka IS NOT NULL
        AND (trim(text_ka) = trim(text_content) OR text_ka !~ ''[\u10A0-\u10FF]'')
    ';
  END IF;

  -- Step 4: Recompute books metadata->'translatedLangs'
  -- Remove 'ka' from books that have ANY chapter missing valid Georgian translation
  WITH book_translation_status AS (
    SELECT
      b.id AS book_id,
      COUNT(c.id) AS total_chapters,
      COUNT(c.id) FILTER (
        WHERE (c.metadata->>'text_ka' IS NOT NULL AND c.metadata->>'text_ka' ~ '[\u10A0-\u10FF]')
      ) AS valid_ka_chapters
    FROM public.books b
    JOIN public.chapters c ON c.book_id = b.id
    GROUP BY b.id
  )
  UPDATE public.books b
  SET
    metadata = jsonb_set(
      COALESCE(b.metadata, '{}'::jsonb),
      '{translatedLangs}',
      CASE
        WHEN s.total_chapters > 0 AND s.valid_ka_chapters = s.total_chapters THEN
          (
            SELECT jsonb_agg(DISTINCT elem)
            FROM jsonb_array_elements_text(COALESCE(b.metadata->'translatedLangs', '[]'::jsonb) || '["ka"]'::jsonb) AS elem
          )
        ELSE
          COALESCE((
            SELECT jsonb_agg(elem)
            FROM jsonb_array_elements_text(COALESCE(b.metadata->'translatedLangs', '[]'::jsonb)) AS elem
            WHERE elem <> 'ka'
          ), '[]'::jsonb)
      END
    ),
    updated_at = now()
  FROM book_translation_status s
  WHERE b.id = s.book_id;

  GET DIAGNOSTICS repaired_books = ROW_COUNT;
  RAISE NOTICE 'Migration 005 completed: % corrupted chapters cleaned, % books synchronized.', corrupted_count, repaired_books;
END $$;
