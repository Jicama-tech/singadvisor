
import { savePost } from "@/app/admin/actions";
import type { FormState } from "@/lib/form-state";
import { AdminForm, FormSection, Toggle } from "@/components/admin/AdminForm";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { BLOG_CATEGORIES } from "@/lib/constants";
import { jsonToLines } from "@/lib/utils";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string;
  published: boolean;
  featured: boolean;
  publishedAt: Date | null;
  authorId: string | null;
};

const toDateInput = (d: Date | null | undefined) =>
  d ? d.toISOString().slice(0, 10) : "";

export function PostForm({
  post,
  authors,
  action = savePost,
}: {
  post?: Post;
  authors: { id: string; name: string }[];
  action?: (formData: FormData) => Promise<FormState | void>;
}) {
  return (
    <AdminForm
      action={action}
      id={post?.id}
      cancelHref="/admin/blog"
      submitLabel={post ? "Save changes" : "Publish article"}
      wide
    >
      {(errors, values) => {
        const submitted = Object.keys(values).length > 0;
        return (
          <>
            <FormSection title="Basics">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title" htmlFor="b-title" required error={errors.title}>
                  <Input
                    id="b-title"
                    name="title"
                    required
                    defaultValue={values.title ?? post?.title}
                  />
                </Field>

                <Field
                  label="URL slug"
                  htmlFor="b-slug"
                  hint="Leave blank to generate from the title."
                  error={errors.slug}
                >
                  <Input
                    id="b-slug"
                    name="slug"
                    defaultValue={values.slug ?? post?.slug}
                    placeholder="why-training-dies-by-monday"
                  />
                </Field>
              </div>

              <Field
                label="Excerpt"
                htmlFor="b-excerpt"
                hint="One or two sentences. Shown on cards, search results and social previews."
                error={errors.excerpt}
              >
                <Textarea
                  id="b-excerpt"
                  name="excerpt"
                  rows={3}
                  defaultValue={values.excerpt ?? post?.excerpt}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category" htmlFor="b-category" error={errors.category}>
                  <Select
                    id="b-category"
                    key={values.category ?? post?.category ?? "Insights"}
                    name="category"
                    defaultValue={values.category ?? post?.category ?? "Insights"}
                  >
                    {BLOG_CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </Field>

                <Field label="Author" htmlFor="b-author" error={errors.authorId}>
                  <Select
                    id="b-author"
                    key={values.authorId ?? post?.authorId ?? ""}
                    name="authorId"
                    defaultValue={values.authorId ?? post?.authorId ?? ""}
                  >
                    <option value="">Unattributed</option>
                    {authors.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Field
                label="Cover image path"
                htmlFor="b-cover"
                hint="A path under /public, e.g. /Images/Trainingimgae/traing.jpg"
                error={errors.coverImage}
              >
                <Input
                  id="b-cover"
                  name="coverImage"
                  defaultValue={values.coverImage ?? post?.coverImage}
                />
              </Field>
            </FormSection>

            <FormSection
              title="Article"
              description="Markdown: ## headings, **bold**, *italic*, - lists, > quotes, [links](https://…). Raw HTML is ignored for safety."
            >
              <Field label="Body" htmlFor="b-content" required error={errors.content}>
                <Textarea
                  id="b-content"
                  name="content"
                  rows={22}
                  required
                  className="font-mono text-sm"
                  defaultValue={values.content ?? post?.content}
                  placeholder={"Opening paragraph…\n\n## A heading\n\nMore text, with **emphasis**."}
                />
              </Field>

              <Field
                label="Tags"
                htmlFor="b-tags"
                hint="One per line. Shown on the article and searchable."
                error={errors.tags}
              >
                <Textarea
                  id="b-tags"
                  name="tags"
                  rows={4}
                  defaultValue={values.tags ?? jsonToLines(post?.tags)}
                />
              </Field>
            </FormSection>

            <FormSection title="Publishing">
              <Toggle
                name="published"
                label="Published"
                hint="Unticked keeps it as a draft, hidden from the public blog."
                defaultChecked={
                  submitted ? values.published === "on" : (post?.published ?? true)
                }
              />
              <Toggle
                name="featured"
                label="Featured"
                hint="Eligible for the home page highlight."
                defaultChecked={
                  submitted ? values.featured === "on" : (post?.featured ?? false)
                }
              />
              <Field
                label="Publication date"
                htmlFor="b-date"
                hint="Leave blank to stamp with today's date when first published."
                error={errors.publishedAt}
              >
                <Input
                  id="b-date"
                  name="publishedAt"
                  type="date"
                  defaultValue={values.publishedAt ?? toDateInput(post?.publishedAt)}
                  className="max-w-52"
                />
              </Field>
            </FormSection>
          </>
        );
      }}
    </AdminForm>
  );
}
