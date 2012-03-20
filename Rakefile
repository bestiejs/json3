task :default => ["lib/json3.min.js", "index.html"]

template = <<-EOS
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>JSON 3</title>
  <link rel="stylesheet" href="page.css" media="screen">
</head>
<body>
<%= Kramdown::Document.new(File.read(contents)).to_html %>
<script src="lib/spec.js"></script>
</body>
</html>
EOS

desc "Compresses JSON 3 using the Closure Compiler."
file "lib/json3.min.js" => "lib/json3.js" do |task|
  require "closure-compiler"

  File.open(task.name, "w+") do |compressed|
    compressed << Closure::Compiler.new(:compilation_level => "SIMPLE_OPTIMIZATIONS").compile(File.read(task.prerequisites.first))
  end
end

desc "Generates the GitHub project page."
file "index.html" => ["README.md"] do |task|
  require "erb"
  require "kramdown"

  contents = task.prerequisites.first
  File.open(task.name, "wb") do |docs|
    docs << ERB.new(template).result(binding)
  end
end